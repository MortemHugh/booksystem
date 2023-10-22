const currentPath = window.location.pathname;

// Find the navigation item (parent of the nav-link) that matches the current path or its parent path and add the "active" class
document.querySelectorAll('.nav-item').forEach((item) => {
  const link = item.querySelector('.nav-link');
  const href = link.getAttribute('href');
  if (href === currentPath || currentPath.startsWith(href)) {
    item.classList.add('active');
  }
});


