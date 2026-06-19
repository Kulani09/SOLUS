CREATE DATABASE IF NOT EXISTS solus_db;
USE solus_db;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id VARCHAR(10) PRIMARY KEY,
  category VARCHAR(40) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2),
  image VARCHAR(255),
  stock INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id VARCHAR(10) NOT NULL,
  size VARCHAR(10) DEFAULT 'M',
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_cart (user_id, product_id, size),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery DECIMAL(10,2) NOT NULL DEFAULT 350.00,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('Processing','Packed','Shipped','Delivered','Cancelled') DEFAULT 'Processing',
  full_name VARCHAR(100),
  phone VARCHAR(30),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id VARCHAR(10) NOT NULL,
  title VARCHAR(150) NOT NULL,
  size VARCHAR(10),
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL,
  subject VARCHAR(150),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (id, category, title, description, price, old_price, image, stock) VALUES
('m1','men','Essential Performance Tee','Breathable tee for training and everyday wear.',5250,6250,'images/mens-tee.jpg',30),
('m2','men','Seamless Active Shirt','Soft stretch fabric with a clean athletic fit.',5750,6900,'images/essential-shirt.jpg',25),
('m3','men','Urban Motion Top','A lightweight top built for all-day comfort.',4990,5890,'images/urban-motion-top.jpg',25),
('m4','men','Core Jogger Pant','Tapered joggers made for movement.',6450,7600,'images/jogger-pant.jpg',20),
('w1','women','365 Sports Bra','Supportive fit for gym days and active routines.',4850,5600,'images/365-sports-bra.jpg',30),
('w2','women','Essential Polo Dress','Sporty silhouette with a premium finish.',6950,7850,'images/essential-polo-dress.jpg',20),
('w3','women','Studio Fit Set','Clean and minimal activewear for daily movement.',6200,7200,'images/women.jpg',18),
('w4','women','Everyday Motion Top','Easy layering piece for workouts or casual looks.',4550,5300,'images/womens.jpg',25),
('a1','accessories','Essential Cap','Classic cap for sun protection and style.',2750,3200,'images/essential-cap.jpg',40),
('a2','accessories','Day to Day Backpack','Functional backpack with room for daily essentials.',8250,9200,'images/day-to-day-backpack.jpg',15),
('a3','accessories','Dual Strap Carry','Lightweight crossbody option with sleek detailing.',3950,4500,'images/dual-strap.jpg',20),
('a4','accessories','Lifestyle Accessory Set','Simple pieces that complete your active wardrobe.',3450,3990,'images/accessories.jpg',20);

-- Admin login: admin@solus.com / admin123
INSERT INTO users (name, email, phone, password, role) VALUES
('Solus Admin', 'admin@solus.com', '+94 77 123 4567', '$2y$12$4bfXaEb./C1beMhsOxn2ueeWH1LMk1bp.4HRUnyLsrht3zP6pq7ju', 'admin');
