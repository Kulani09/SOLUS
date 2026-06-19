<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

$action = $_GET['action'] ?? 'list';
if ($action === 'list') {
    $category = clean($_GET['category'] ?? '');
    $search = clean($_GET['search'] ?? '');
    $sql = 'SELECT id, category, title, description AS `desc`, price, old_price AS oldPrice, image AS img, stock FROM products WHERE 1=1';
    $params = [];
    if ($category) { $sql .= ' AND category = ?'; $params[] = $category; }
    if ($search) { $sql .= ' AND (title LIKE ? OR description LIKE ?)'; $params[] = "%$search%"; $params[] = "%$search%"; }
    $sql .= ' ORDER BY category, title';
    $stmt = $pdo->prepare($sql); $stmt->execute($params);
    json_response(true, 'Products loaded.', ['products'=>$stmt->fetchAll()]);
}

if ($action === 'detail') {
    $id = clean($_GET['id'] ?? '');
    $stmt = $pdo->prepare('SELECT id, category, title, description AS `desc`, price, old_price AS oldPrice, image AS img, stock FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) json_response(false, 'Product not found.', [], 404);
    json_response(true, 'Product loaded.', ['product'=>$product]);
}

json_response(false, 'Unknown products action.', [], 404);
