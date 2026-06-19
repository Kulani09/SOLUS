<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
$user_id = require_login();
$action = $_GET['action'] ?? 'list';
$data = input_data();

if ($action === 'list') {
    $stmt = $pdo->prepare('SELECT c.id AS cart_id, p.id, p.title, p.price, p.image AS img, c.size, c.quantity AS qty FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY c.updated_at DESC');
    $stmt->execute([$user_id]);
    $items = $stmt->fetchAll();
    $subtotal = array_sum(array_map(fn($i) => $i['price'] * $i['qty'], $items));
    $delivery = $subtotal > 0 ? 350 : 0;
    json_response(true, 'Cart loaded.', ['items'=>$items, 'subtotal'=>$subtotal, 'delivery'=>$delivery, 'total'=>$subtotal+$delivery]);
}

if ($action === 'add') {
    $product_id = clean($data['product_id'] ?? '');
    $size = clean($data['size'] ?? 'M');
    $qty = max(1, (int)($data['quantity'] ?? 1));
    $stmt = $pdo->prepare('SELECT id FROM products WHERE id=?');
    $stmt->execute([$product_id]);
    if (!$stmt->fetch()) json_response(false, 'Product not found.', [], 404);
    $stmt = $pdo->prepare('INSERT INTO cart_items (user_id, product_id, size, quantity) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)');
    $stmt->execute([$user_id, $product_id, $size, $qty]);
    json_response(true, 'Item added to cart.');
}

if ($action === 'update') {
    $cart_id = (int)($data['cart_id'] ?? 0);
    $qty = (int)($data['quantity'] ?? 1);
    if ($qty <= 0) {
        $stmt = $pdo->prepare('DELETE FROM cart_items WHERE id=? AND user_id=?');
        $stmt->execute([$cart_id, $user_id]);
        json_response(true, 'Item removed from cart.');
    }
    $stmt = $pdo->prepare('UPDATE cart_items SET quantity=? WHERE id=? AND user_id=?');
    $stmt->execute([$qty, $cart_id, $user_id]);
    json_response(true, 'Cart updated.');
}

if ($action === 'remove') {
    $cart_id = (int)($data['cart_id'] ?? 0);
    $stmt = $pdo->prepare('DELETE FROM cart_items WHERE id=? AND user_id=?');
    $stmt->execute([$cart_id, $user_id]);
    json_response(true, 'Item removed.');
}

if ($action === 'clear') {
    $stmt = $pdo->prepare('DELETE FROM cart_items WHERE user_id=?');
    $stmt->execute([$user_id]);
    json_response(true, 'Cart cleared.');
}

json_response(false, 'Unknown cart action.', [], 404);
