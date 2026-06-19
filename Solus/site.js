const API_BASE = 'api';
let PRODUCTS = { men: [], women: [], accessories: [] };
let CURRENT_USER = null;
let CART_ITEMS = [];

function formatCurrency(value){ return `LKR ${Number(value || 0).toLocaleString('en-LK')}`; }

async function apiGet(url){
  try {
    const res = await fetch(`${API_BASE}/${url}`, { credentials:'same-origin' });
    if (!res.ok && res.status !== 401 && res.status !== 403 && res.status !== 404 && res.status !== 422) {
      return { success: false, message: 'Server error. Please try again.' };
    }
    return res.json();
  } catch(e) {
    return { success: false, message: 'Network error. Please check your connection.' };
  }
}

async function apiPost(url, data = {}){
  try {
    const res = await fetch(`${API_BASE}/${url}`, {
      method:'POST', credentials:'same-origin',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify(data)
    });
    return res.json();
  } catch(e) {
    return { success: false, message: 'Network error. Please check your connection.' };
  }
}

function showMessage(message, type = 'info'){
  // Remove existing toast
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function requireLoginMessage(result){
  if(result && result.message === 'Please login first.'){
    showMessage('Please login first.', 'warn');
    setTimeout(() => { location.href = 'login.html'; }, 1200);
    return true;
  }
  return false;
}

function groupProducts(products){
  PRODUCTS = { men: [], women: [], accessories: [] };
  products.forEach(p => {
    const item = { ...p, price:Number(p.price), oldPrice:Number(p.oldPrice || 0) };
    if(PRODUCTS[item.category]) PRODUCTS[item.category].push(item);
  });
}

async function loadProducts(){
  const result = await apiGet('products.php?action=list');
  if(result.success) groupProducts(result.data.products || []);
}

async function loadUser(){
  const result = await apiGet('auth.php?action=me');
  CURRENT_USER = result.success ? result.data.user : null;
  syncProfileName();
  syncLoginLinks();
  seedUserForm();
  showAdminLink();
}

function showAdminLink(){
  const adminLinks = document.querySelectorAll('.js-admin-link');
  if(CURRENT_USER && CURRENT_USER.role === 'admin'){
    adminLinks.forEach(el => el.style.display = '');
  } else {
    adminLinks.forEach(el => el.style.display = 'none');
  }
}

async function loadCart(){
  const result = await apiGet('cart.php?action=list');
  if(result.success){
    CART_ITEMS = result.data.items || [];
    updateNavCount();
    renderCart(result.data);
  } else {
    CART_ITEMS = [];
    updateNavCount();
    renderCart({items:[], subtotal:0, delivery:0, total:0});
  }
}

function updateNavCount(){
  const count = CART_ITEMS.reduce((sum,item)=>sum + Number(item.qty || 0), 0);
  document.querySelectorAll('.js-cart-count').forEach(el => el.textContent = count);
}

function syncProfileName(){
  document.querySelectorAll('.js-user-name').forEach(el => el.textContent = CURRENT_USER?.name ? CURRENT_USER.name.split(' ')[0] : 'Profile');
}

function syncLoginLinks(){
  document.querySelectorAll('.login-link, .mobile-panel a[href="login.html"]').forEach(el => {
    el.style.display = CURRENT_USER ? 'none' : '';
  });
}

function productCard(product){
  const discount = product.oldPrice > product.price
    ? Math.round((1 - product.price/product.oldPrice)*100)
    : 0;
  return `
    <article class="card">
      ${discount ? `<div class="badge-sale">-${discount}%</div>` : ''}
      <div class="card-media"><img src="${product.img}" alt="${product.title}" loading="lazy"></div>
      <div class="card-body">
        <h3 class="card-title">${product.title}</h3>
        <p class="card-desc">${product.desc || ''}</p>
        <div class="price">
          <span class="now">${formatCurrency(product.price)}</span>
          ${product.oldPrice ? `<span class="was">${formatCurrency(product.oldPrice)}</span>` : ''}
        </div>
        <div class="card-actions">
          <a class="btn secondary" href="product.html?id=${product.id}">View</a>
          <button class="btn primary" onclick="quickAdd('${product.id}')">Add to Cart</button>
        </div>
      </div>
    </article>`;
}

async function quickAdd(id){
  await addToCart(id, 'M');
}

async function addToCart(productId, size='M'){
  const result = await apiPost('cart.php?action=add', { product_id:productId, size, quantity:1 });
  if(requireLoginMessage(result)) return;
  showMessage(result.message, result.success ? 'success' : 'error');
  if(result.success) await loadCart();
}

function renderHomeProducts(){
  const men = document.getElementById('menGrid');
  const women = document.getElementById('womenGrid');
  const accessories = document.getElementById('accessoriesGrid');
  if(men) men.innerHTML = PRODUCTS.men.length ? PRODUCTS.men.map(productCard).join('') : '<div class="empty-state">No products available.</div>';
  if(women) women.innerHTML = PRODUCTS.women.length ? PRODUCTS.women.map(productCard).join('') : '<div class="empty-state">No products available.</div>';
  if(accessories) accessories.innerHTML = PRODUCTS.accessories.length ? PRODUCTS.accessories.map(productCard).join('') : '<div class="empty-state">No products available.</div>';
}

function setupSearch(){
  const input = document.getElementById('searchInput');
  if(!input) return;
  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const value = input.value.trim().toLowerCase();
      ['men','women','accessories'].forEach(group => {
        const grid = document.getElementById(`${group}Grid`);
        if(!grid) return;
        const filtered = PRODUCTS[group].filter(item => `${item.title} ${item.desc}`.toLowerCase().includes(value));
        grid.innerHTML = filtered.length ? filtered.map(productCard).join('') : `<div class="empty-state">No products found for "${input.value}".</div>`;
      });
    }, 250);
  });
}

function setupImageFallbacks(){
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      if(!img.dataset.fallbackApplied){
        img.dataset.fallbackApplied = '1';
        img.src = 'images/solus.jpg';
      }
    });
  });
}

function setupMenu(){
  const btn = document.getElementById('menuBtn');
  const panel = document.getElementById('mobilePanel');
  if(btn && panel){
    btn.addEventListener('click', ()=> panel.classList.toggle('open'));
    // Close panel when clicking a link
    panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => panel.classList.remove('open')));
  }
}

async function buildProductDetail(){
  const titleEl = document.getElementById('productTitle');
  if(!titleEl) return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'm1';

  // Try to fetch directly from API for accurate stock info
  const result = await apiGet(`products.php?action=detail&id=${encodeURIComponent(id)}`);
  let product;
  if(result.success && result.data.product){
    product = result.data.product;
    product.price = Number(product.price);
    product.oldPrice = Number(product.oldPrice || 0);
  } else {
    const all = [...PRODUCTS.men, ...PRODUCTS.women, ...PRODUCTS.accessories];
    product = all.find(item => item.id === id) || all[0];
  }
  if(!product) return;

  document.getElementById('productTitle').textContent = product.title;
  document.getElementById('productPrice').textContent = formatCurrency(product.price);
  const oldPriceEl = document.getElementById('productOldPrice');
  if(oldPriceEl) oldPriceEl.textContent = product.oldPrice ? formatCurrency(product.oldPrice) : '';
  document.getElementById('productImg').src = product.img;
  document.getElementById('productImg').alt = product.title;
  const descEl = document.getElementById('productDesc');
  if(descEl) descEl.textContent = product.desc || '';

  let selectedSize = 'M';
  document.querySelectorAll('.size').forEach(btn => {
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.size').forEach(el=>el.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
    });
  });

  document.getElementById('addToCartBtn')?.addEventListener('click', ()=> addToCart(product.id, selectedSize));
}

function renderCart(summary = null){
  const list = document.getElementById('cartList');
  const subtotalEl = document.getElementById('subtotal');
  const grandEl = document.getElementById('grandTotal');
  const deliveryEl = document.getElementById('delivery');
  if(!list) return;
  const cart = summary?.items || CART_ITEMS;
  if(cart.length === 0){
    list.innerHTML = `<div class="empty-state">Your cart is empty. <a class="link" href="Solus.html">Start shopping</a>.</div>`;
    if(subtotalEl) subtotalEl.textContent = formatCurrency(0);
    if(deliveryEl) deliveryEl.textContent = formatCurrency(0);
    if(grandEl) grandEl.textContent = formatCurrency(0);
    return;
  }
  list.innerHTML = cart.map((item,index)=>`
    <div class="cart-row">
      <img src="${item.img}" alt="${item.title}" loading="lazy">
      <div class="cart-info">
        <h3>${item.title}</h3>
        <p>Size: ${item.size}</p>
        <p>${formatCurrency(item.price)}</p>
        <div class="qty-wrap">
          <button onclick="changeQty(${index},-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${index},1)">+</button>
        </div>
        <button class="btn danger" style="margin-top:.8rem" onclick="removeItem(${index})">Remove</button>
      </div>
      <div class="item-total">${formatCurrency(item.price * item.qty)}</div>
    </div>`).join('');
  const subtotal = summary?.subtotal ?? cart.reduce((sum,item)=>sum + item.price * item.qty, 0);
  const delivery = summary?.delivery ?? (subtotal > 0 ? 350 : 0);
  if(subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if(deliveryEl) deliveryEl.textContent = formatCurrency(delivery);
  if(grandEl) grandEl.textContent = formatCurrency(summary?.total ?? subtotal + delivery);
}

async function changeQty(index, delta){
  const item = CART_ITEMS[index];
  if(!item) return;
  const newQty = Number(item.qty) + delta;
  if(newQty < 1){ await removeItem(index); return; }
  const result = await apiPost('cart.php?action=update', { cart_id:item.cart_id, quantity:newQty });
  if(result.success) await loadCart(); else showMessage(result.message, 'error');
}

async function removeItem(index){
  const item = CART_ITEMS[index];
  if(!item) return;
  const result = await apiPost('cart.php?action=remove', { cart_id:item.cart_id });
  if(result.success){ showMessage('Item removed.', 'success'); await loadCart(); }
  else showMessage(result.message, 'error');
}

async function checkout(){
  if(!CURRENT_USER){ showMessage('Please login first.', 'warn'); setTimeout(()=>location.href='login.html',1200); return; }
  const result = await apiPost('orders.php?action=checkout', {
    full_name: CURRENT_USER?.name || '', phone: CURRENT_USER?.phone || '', address: ''
  });
  if(requireLoginMessage(result)) return;
  showMessage(result.message + (result.success ? ` Order: ${result.data.order_code}` : ''), result.success ? 'success' : 'error');
  if(result.success) setTimeout(()=>location.href='purchase-history.html', 1800);
}

async function renderHistory(){
  const target = document.getElementById('historyList');
  if(!target) return;
  target.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  const result = await apiGet('orders.php?action=history');
  if(requireLoginMessage(result)){ target.innerHTML = ''; return; }
  const orders = result.success ? (result.data.orders || []) : [];
  target.innerHTML = orders.length ? orders.map(order => `
    <div class="order">
      <div class="top">
        <div><h3>${order.order_code}</h3><p class="muted">Date: ${order.date}</p></div>
        <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
      </div>
      <p><strong>Items:</strong> ${order.items.map(i => `${i.title} (${i.size}) ×${i.quantity}`).join(', ')}</p>
      <p><strong>Total:</strong> ${formatCurrency(order.total)}</p>
    </div>`).join('') : `<div class="empty-state">No purchase history yet. <a class="link" href="Solus.html">Start shopping</a>.</div>`;
}

async function trackOrderById(){
  const field = document.getElementById('orderId');
  const resultBox = document.getElementById('trackingResult');
  if(!field || !resultBox) return;
  const id = field.value.trim();
  if(!id){ showMessage('Please enter an order ID.', 'warn'); return; }
  const result = await apiGet(`orders.php?action=track&order_code=${encodeURIComponent(id)}`);
  if(!result.success){ resultBox.innerHTML = `<p class="muted">${result.message}</p>`; return; }
  const order = result.data.order;
  const steps = ['Processing','Packed','Shipped','Delivered'];
  const current = Math.max(0, steps.indexOf(order.status));
  resultBox.innerHTML = `
    <div class="track-card">
      <h3>${order.order_code}</h3>
      <p class="muted">Date: ${order.date}</p>
      <p>Status: <strong class="status-badge status-${order.status.toLowerCase()}">${order.status}</strong></p>
      <p>Total: <strong>${formatCurrency(order.total)}</strong></p>
      <div class="timeline">${steps.map((step,i)=>`<div class="step ${i <= current ? 'active' : ''}">${step}</div>`).join('')}</div>
    </div>`;
}

function seedUserForm(){
  if(!CURRENT_USER) return;
  ['name','email','phone'].forEach(id => { const el = document.getElementById(id); if(el) el.value = CURRENT_USER[id] || ''; });
}

async function logoutUser(){
  const result = await apiGet('auth.php?action=logout');
  showMessage(result.message || 'Signed out successfully.', 'success');
  CURRENT_USER = null;
  setTimeout(() => location.href = 'login.html', 1000);
}

window.quickAdd = quickAdd;
window.changeQty = changeQty;
window.removeItem = removeItem;
window.logoutUser = logoutUser;
window.trackOrderById = trackOrderById;

document.addEventListener('DOMContentLoaded', async () => {
  const registerForm = document.getElementById('registerForm');
  if(registerForm){
    registerForm.reset();
    ['name','email','phone','password'].forEach(id => { const field = document.getElementById(id); if(field) field.value = ''; });
  }
  setupMenu();
  setupImageFallbacks();
  await loadProducts();
  await loadUser();
  await loadCart();
  renderHomeProducts();
  setupSearch();
  await buildProductDetail();
  await renderHistory();

  document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
  document.getElementById('trackBtn')?.addEventListener('click', trackOrderById);

  document.getElementById('contactForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    const result = await apiPost('contact.php', {
      name:document.getElementById('contactName').value,
      email:document.getElementById('contactEmail').value,
      subject:'Contact Message',
      message:document.getElementById('contactMessage').value
    });
    showMessage(result.message, result.success ? 'success' : 'error');
    if(result.success) e.target.reset();
    btn.disabled = false; btn.textContent = 'Send Message';
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating account…';
    const result = await apiPost('auth.php?action=register', {
      name:document.getElementById('name').value,
      email:document.getElementById('email').value,
      phone:document.getElementById('phone').value,
      password:document.getElementById('password').value
    });
    showMessage(result.message, result.success ? 'success' : 'error');
    if(result.success) setTimeout(()=>location.href='profile.html', 1000);
    btn.disabled = false; btn.textContent = 'Create Account';
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';
    const result = await apiPost('auth.php?action=login', {
      email:document.getElementById('loginEmail').value,
      password:document.getElementById('loginPassword').value
    });
    showMessage(result.message, result.success ? 'success' : 'error');
    if(result.success){
      // Redirect admin to admin panel
      if(result.data?.user?.role === 'admin'){
        setTimeout(()=>location.href='admin.html', 900);
      } else {
        setTimeout(()=>location.href='profile.html', 900);
      }
    }
    btn.disabled = false; btn.textContent = 'Sign In';
  });

  document.getElementById('profileForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    const result = await apiPost('auth.php?action=update_profile', {
      name:document.getElementById('name').value,
      email:document.getElementById('email').value,
      phone:document.getElementById('phone').value
    });
    showMessage(result.message, result.success ? 'success' : 'error');
    if(result.success){ CURRENT_USER = result.data.user; syncProfileName(); }
    btn.disabled = false; btn.textContent = 'Save Changes';
  });
});
