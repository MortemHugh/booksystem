// Select your carousel elements
const carousel = document.querySelector('#roomCarousel');
const prevButton = carousel.querySelector('.carousel-control-prev');
const nextButton = carousel.querySelector('.carousel-control-next');

// Function to get the current translateX value
function getTranslateX(element) {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return matrix.m41;
}

// Move to the next card
nextButton.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent the default Bootstrap carousel from sliding
  let activeItem = carousel.querySelector('.carousel-item.active');
  let totalScroll = activeItem.scrollWidth;
  let currentScroll = activeItem.scrollLeft;
  let cardWidth = activeItem.querySelector('.col-10.col-md-3.col-lg-3').offsetWidth;
  let newScroll = currentScroll + cardWidth;

  // Check if the new scroll position is beyond the total scroll width
  if (newScroll < totalScroll) {
    activeItem.scrollLeft = newScroll;
  } else {
    // Here you can handle the wrap-around or disable the button
  }
});

// Move to the previous card
prevButton.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent the default Bootstrap carousel from sliding
  let activeItem = carousel.querySelector('.carousel-item.active');
  let currentScroll = activeItem.scrollLeft;
  let cardWidth = activeItem.querySelector('.col-10.col-md-3.col-lg-3').offsetWidth;
  let newScroll = currentScroll - cardWidth;

  // Check if the new scroll position is less than 0
  if (newScroll > 0) {
    activeItem.scrollLeft = newScroll;
  } else {
    // Here you can handle the wrap-around or disable the button
  }
});
