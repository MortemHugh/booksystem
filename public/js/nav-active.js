const currentPath = window.location.pathname;

document.querySelectorAll('.nav-item').forEach((item) => {
  const link = item.querySelector('.nav-link');
  const href = link.getAttribute('href');

  // Remove previously added 'header_active' class
  item.classList.remove('header_active');

  // Check if the href is the homepage ('/') and the currentPath is also '/'
  if (href === '/' && currentPath === '/') {
    item.classList.add('header_active');
  }
  // For other pages
  else if (currentPath.startsWith(href) && href !== '/') {
    item.classList.add('header_active');
  }
});
