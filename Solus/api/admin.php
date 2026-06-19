<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_login();
if (($_SESSION['role'] ?? '') !== 'admin') json_response(false, 'Admin access only.', [], 403);
$action = $_GET['action'] ?? 'dashboard';
$method = $_SERVER['REQUEST_METHOD'];
$data = input_data();

if ($action === 'dashboard') {
  $totalOrders = $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
  $totalRevenue = $pdo->query('SELECT SUM(total) FROM orders WHERE status != "Cancelled"')->fetchColumn() ?? 0;
  $totalCustomers = $pdo->query('SELECT COUNT(*) FROM users WHERE role="customer"')->fetchColumn();
  $totalProducts = $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
  $pendingOrders = $pdo->query('SELECT COUNT(*) FROM orders WHERE status="Processing"')->fetchColumn();
  $recentOrders = $pdo->query('SELECT o.id, o.order_code, o.status, o.total, o.created_at, u.name AS customer FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 8')->fetchAll();
  $breakdown = $pdo->query('SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status')->fetchAll();
  json_response(true, 'Dashboard loaded.', ['stats'=>['total_orders'=>(int)$totalOrders,'total_revenue'=>(float)$totalRevenue,'total_customers'=>(int)$totalCustomers,'total_products'=>(int)$totalProducts,'pending_orders'=>(int)$pendingOrders], 'recent_orders'=>$recentOrders, 'breakdown'=>$breakdown]);
}

if ($action === 'orders') {
  $status = clean($_GET['status'] ?? ''); $search = clean($_GET['search'] ?? '');
  $sql = 'SELECT o.id, o.order_code, o.status, o.total, o.subtotal, o.delivery, o.full_name, o.phone, o.address, DATE_FORMAT(o.created_at,"%d/%m/%Y %H:%i") AS date, u.name AS customer, u.email FROM orders o JOIN users u ON u.id=o.user_id WHERE 1=1';
  $params = [];
  if ($status) { $sql .= ' AND o.status=?'; $params[] = $status; }
  if ($search) { $sql .= ' AND (o.order_code LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'; $s = "%$search%"; array_push($params,$s,$s,$s); }
  $sql .= ' ORDER BY o.created_at DESC LIMIT 200';
  $stmt = $pdo->prepare($sql); $stmt->execute($params); $orders = $stmt->fetchAll();
  foreach($orders as &$order){ $s = $pdo->prepare('SELECT title, size, quantity, price FROM order_items WHERE order_id=?'); $s->execute([$order['id']]); $order['items'] = $s->fetchAll(); }
  json_response(true, 'Orders loaded.', ['orders'=>$orders]);
}

if ($action === 'update_order_status' && $method === 'POST') {
  $order_code = strtoupper(clean($data['order_code'] ?? '')); $status = clean($data['status'] ?? '');
  $allowed = ['Processing','Packed','Shipped','Delivered','Cancelled'];
  if (!in_array($status, $allowed, true)) json_response(false, 'Invalid status.', [], 422);
  $stmt = $pdo->prepare('UPDATE orders SET status=? WHERE order_code=?'); $stmt->execute([$status, $order_code]);
  json_response(true, 'Order status updated.');
}

if ($action === 'products') {
  if ($method === 'GET') { $stmt = $pdo->query('SELECT * FROM products ORDER BY category, title'); json_response(true, 'Products loaded.', ['products'=>$stmt->fetchAll()]); }
  if ($method === 'POST') {
    $id=clean($data['id']??''); $cat=clean($data['category']??''); $title=clean($data['title']??''); $desc=clean($data['description']??''); $price=(float)($data['price']??0); $old=(float)($data['old_price']??0); $img=clean($data['image']??''); $stock=(int)($data['stock']??0);
    if (!$id || !$cat || !$title || $price <= 0) json_response(false, 'ID, category, title, and price are required.', [], 422);
    $stmt = $pdo->prepare('SELECT id FROM products WHERE id=?'); $stmt->execute([$id]); if ($stmt->fetch()) json_response(false, 'Product ID already exists.', [], 409);
    $pdo->prepare('INSERT INTO products (id,category,title,description,price,old_price,image,stock) VALUES (?,?,?,?,?,?,?,?)')->execute([$id,$cat,$title,$desc,$price,$old,$img,$stock]);
    json_response(true, 'Product created.');
  }
  if ($method === 'PUT') {
    $id = clean($data['id'] ?? '');
    $pdo->prepare('UPDATE products SET category=?,title=?,description=?,price=?,old_price=?,image=?,stock=? WHERE id=?')->execute([clean($data['category']??''), clean($data['title']??''), clean($data['description']??''),(float)($data['price']??0),(float)($data['old_price']??0), clean($data['image']??''),(int)($data['stock']??0), $id]);
    json_response(true, 'Product updated.');
  }
  if ($method === 'DELETE') { $id=clean($data['id']??''); $pdo->prepare('DELETE FROM products WHERE id=?')->execute([$id]); json_response(true, 'Product deleted.'); }
}

if ($action === 'customers') {
  $search = clean($_GET['search'] ?? '');
  $sql = 'SELECT u.id, u.name, u.email, u.phone, u.role, DATE_FORMAT(u.created_at,"%d/%m/%Y") AS joined, COUNT(o.id) AS order_count, COALESCE(SUM(o.total),0) AS total_spent FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE 1=1';
  $params = [];
  if ($search) { $sql .= ' AND (u.name LIKE ? OR u.email LIKE ?)'; $s = "%$search%"; $params = [$s,$s]; }
  $sql .= ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200';
  $stmt = $pdo->prepare($sql); $stmt->execute($params); json_response(true, 'Customers loaded.', ['customers'=>$stmt->fetchAll()]);
}

if ($action === 'messages') { $stmt = $pdo->query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200'); json_response(true, 'Messages loaded.', ['messages'=>$stmt->fetchAll()]); }

json_response(false, 'Unknown admin action.', [], 404);
