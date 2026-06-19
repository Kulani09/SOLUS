<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
$action = $_GET['action'] ?? '';
$data = input_data();

if ($action === 'track') {
    $order_code = strtoupper(clean($_GET['order_code'] ?? ''));
    $stmt = $pdo->prepare('SELECT order_code, status, total, DATE_FORMAT(created_at, "%d/%m/%Y") AS date FROM orders WHERE order_code=?');
    $stmt->execute([$order_code]);
    $order = $stmt->fetch();
    if (!$order) json_response(false, 'Order not found.', [], 404);
    json_response(true, 'Order found.', ['order'=>$order]);
}

$user_id = require_login();
if ($action === 'checkout') {
    $stmt = $pdo->prepare('SELECT c.product_id, c.size, c.quantity, p.title, p.price FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=?');
    $stmt->execute([$user_id]);
    $items = $stmt->fetchAll();
    if (!$items) json_response(false, 'Your cart is empty.', [], 422);
    $subtotal = array_sum(array_map(fn($i) => $i['price'] * $i['quantity'], $items));
    $delivery = 350; $total = $subtotal + $delivery; $order_code = 'SOL-' . time();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('INSERT INTO orders (order_code,user_id,subtotal,delivery,total,full_name,phone,address) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->execute([$order_code,$user_id,$subtotal,$delivery,$total,clean($data['full_name'] ?? ''),clean($data['phone'] ?? ''),clean($data['address'] ?? '')]);
    $order_id = (int)$pdo->lastInsertId();
    $itemStmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, title, size, price, quantity) VALUES (?,?,?,?,?,?)');
    foreach ($items as $item) $itemStmt->execute([$order_id,$item['product_id'],$item['title'],$item['size'],$item['price'],$item['quantity']]);
    $pdo->prepare('DELETE FROM cart_items WHERE user_id=?')->execute([$user_id]);
    $pdo->commit();
    json_response(true, 'Order placed successfully.', ['order_code'=>$order_code, 'total'=>$total]);
}

if ($action === 'history') {
    $stmt = $pdo->prepare('SELECT id, order_code, status, subtotal, delivery, total, DATE_FORMAT(created_at, "%d/%m/%Y") AS date FROM orders WHERE user_id=? ORDER BY created_at DESC');
    $stmt->execute([$user_id]);
    $orders = $stmt->fetchAll();
    foreach ($orders as &$order) { $s = $pdo->prepare('SELECT title, size, quantity, price FROM order_items WHERE order_id=?'); $s->execute([$order['id']]); $order['items'] = $s->fetchAll(); }
    json_response(true, 'Orders loaded.', ['orders'=>$orders]);
}

json_response(false, 'Unknown orders action.', [], 404);
