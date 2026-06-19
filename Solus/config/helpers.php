<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

function json_response($success, $message = '', $data = [], $status = 200) {
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data
    ]);
    exit;
}

function input_data() {
    $raw  = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (is_array($json)) return $json;
    // Also try $_POST for form submissions
    if (!empty($_POST)) return $_POST;
    // Try parse_str for PUT/DELETE with form-encoded body
    parse_str($raw, $parsed);
    return is_array($parsed) ? $parsed : [];
}

function require_login() {
    if (empty($_SESSION['user_id'])) {
        json_response(false, 'Please login first.', [], 401);
    }
    return (int) $_SESSION['user_id'];
}

function clean($value) {
    return trim(htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8'));
}
