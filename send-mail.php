<?php

$envPath = '../trustco-config/.env';

if (!file_exists($envPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server configuration error']);
    exit;
}

foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
    [$key, $value] = explode('=', $line, 2);
    $_ENV[trim($key)] = trim($value);
}

define('RECIPIENT_EMAIL', $_ENV['RECIPIENT_EMAIL']);
define('RECIPIENT_NAME',  $_ENV['RECIPIENT_NAME']);
define('SMTP_HOST',       $_ENV['SMTP_HOST']);
define('SMTP_PORT', (int) $_ENV['SMTP_PORT']);
define('SMTP_USER',       $_ENV['SMTP_USER']);
define('SMTP_PASS',       $_ENV['SMTP_PASS']);
define('ALLOWED_ORIGIN',  $_ENV['ALLOWED_ORIGIN']);
// ──────────────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');

// ── CORS ──────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === ALLOWED_ORIGIN || strpos($origin, 'github.io') !== false) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Method guard ──────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// ── Parse body ────────────────────────────────────────────────────────────
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

// Also accept regular form POST
if (!$data) {
    $data = $_POST;
}

// ── Validate ──────────────────────────────────────────────────────────────
$name    = trim($data['from_name']  ?? '');
$email   = trim($data['from_email'] ?? '');
$message = trim($data['message']    ?? '');

$errors = [];
if (!$name)                            $errors[] = 'الاسم مطلوب';
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'البريد الإلكتروني غير صحيح';
if (!$message)                         $errors[] = 'الرسالة مطلوبة';

if ($errors) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => implode(' | ', $errors)]);
    exit;
}

// ── Sanitize ──────────────────────────────────────────────────────────────
$name    = htmlspecialchars($name,    ENT_QUOTES, 'UTF-8');
$email   = htmlspecialchars($email,   ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// ── Rate limiting (simple file-based) ─────────────────────────────────────
$ip       = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ratefile = sys_get_temp_dir() . '/trustco_rl_' . md5($ip) . '.txt';
$now      = time();
$window   = 300;   // 5 minutes
$limit    = 3;     // max 3 submissions per window per IP

$timestamps = [];
if (file_exists($ratefile)) {
    $timestamps = array_filter(
        explode(',', file_get_contents($ratefile)),
        fn($t) => ($now - (int)$t) < $window
    );
}
if (count($timestamps) >= $limit) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'يرجى الانتظار قبل إرسال رسالة أخرى']);
    exit;
}
$timestamps[] = $now;
file_put_contents($ratefile, implode(',', $timestamps));

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = SMTP_PORT;
    $mail->CharSet    = 'UTF-8';

    // Recipients
    $mail->setFrom(SMTP_USER, RECIPIENT_NAME);
    $mail->addAddress(RECIPIENT_EMAIL, RECIPIENT_NAME);
    $mail->addReplyTo($email, $name);  

    // Content
    $mail->isHTML(true);
    $mail->Subject = "رسالة جديدة من موقع مصنع الثقة — {$name}";
    $mail->Body    = "
<!DOCTYPE html>
<html dir='rtl' lang='ar'>
<head><meta charset='UTF-8'></head>
<body style='font-family: Arial, sans-serif; direction: rtl; background: #f9f9f9; padding: 24px;'>
  <div style='max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px;
              border: 1px solid #e0e0e0; overflow: hidden;'>
    <div style='background: #1a1a2e; padding: 24px; text-align: center;'>
      <h2 style='color: #fff; margin: 0; font-size: 18px;'>رسالة جديدة من الموقع</h2>
      <p style='color: #aaa; margin: 4px 0 0; font-size: 13px;'>مصنع الثقة — نموذج التواصل</p>
    </div>
    <div style='padding: 24px;'>
      <table style='width: 100%; border-collapse: collapse; font-size: 14px;'>
        <tr>
          <td style='padding: 10px 0; color: #888; width: 130px; vertical-align: top;'>الاسم</td>
          <td style='padding: 10px 0; color: #222; font-weight: bold;'>{$name}</td>
        </tr>
        <tr style='border-top: 1px solid #f0f0f0;'>
          <td style='padding: 10px 0; color: #888; vertical-align: top;'>البريد الإلكتروني</td>
          <td style='padding: 10px 0; color: #222;'><a href='mailto:{$email}' style='color:#1a73e8;'>{$email}</a></td>
        </tr>
        <tr style='border-top: 1px solid #f0f0f0;'>
          <td style='padding: 10px 0; color: #888; vertical-align: top;'>الرسالة</td>
          <td style='padding: 10px 0; color: #222; line-height: 1.7;'>" . nl2br($message) . "</td>
        </tr>
      </table>
    </div>
    <div style='background: #f5f5f5; padding: 14px 24px; font-size: 12px; color: #aaa; text-align: center;'>
      أُرسلت هذه الرسالة من نموذج التواصل على موقع مصنع الثقة
    </div>
  </div>
</body>
</html>";

    $mail->AltBody = "اسم المرسل: {$name}\nالبريد: {$email}\n\nالرسالة:\n{$message}";

    $mail->send();

    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'تم إرسال رسالتك بنجاح']);
} catch (Exception $e) {
    error_log('Trustco mailer error: ' . $mail->ErrorInfo);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.']);
}
