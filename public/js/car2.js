$(document).ready(function(){
    // Ensure that the following console.log prints the expected number of elements.
    console.log($('.room-slider').length + ' sliders found.');
  
    // Initialize Slick Carousel
    $('.room-slider').slick({
      infinite: true,
      slidesToShow: 3,
      slidesToScroll: 1,
      prevArrow: $('.slick-prev'), // Check if these selectors match your arrows
      nextArrow: $('.slick-next'),
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1
          }
        },
        {
          breakpoint: 600,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1
          }
        }
      ]
    });
  
    // Check for navigation arrows presence
    if ($('.slick-prev').length === 0) {
      console.log('Previous arrow not found.');
    }
  
    if ($('.slick-next').length === 0) {
      console.log('Next arrow not found.');
    }
  });
  