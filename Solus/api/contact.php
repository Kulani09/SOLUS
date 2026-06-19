<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
$data = input_data();
$name = clean($data['name'] ?? '');
$email = clean($data['email'] ?? '');
$subject = clean($data['subject'] ?? 'Contact Message');
$message = clean($data['message'] ?? '');
if (!$name || !$email || !$message) json_response(false, 'Name, email, and message are required.', [], 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(false, 'Invalid email address.', [], 422);
$stmt = $pdo->prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)');
$stmt->execute([$name, $email, $subject, $message]);
json_response(true, 'Message sent successfully.');
