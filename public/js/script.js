window.addEventListener('scroll', function(){
    const header = document.querySelector('header');
    header.classList.toggle("sticky", this.window.scrollY > 0);
});

function toggleMenu(){
    const menutog = document.querySelector('.menuTog');
    const navigation = document.querySelector('.navigation');
    menutog.classList.toggle('active');
    navigation.classList.toggle('active');
}



const galleryContainer = document.querySelector('.gallery-container'); 
const galleryControlsContainer = document.querySelector('.gallery-controls'); 
const galleryControls = ['previous', 'next'];
const galleryItems = document.querySelectorAll('.card_room');

class Carousel {

    constructor (container_room, items, controls) {
        this.carouselContainer = container_room;
        this.carouselControls = controls; 
        this.carouselArray = [...items];
    }
    
    updateGallery(){
        this.carouselArray.forEach(el => {
            el.classList.remove('gallery-item-1');
            el.classList.remove('gallery-item-2');
            el.classList.remove('gallery-item-3');
            el.classList.remove('gallery-item-4'); 
            el.classList.remove('gallery-item-5'); 
        });

        this.carouselArray.slice(0, 5).forEach((el, i) => {
            el.classList.add(`gallery-item-${i+1}`); 
        });
    }

    setCurrentState(direction){
        if (direction.className == 'gallery-controls-previous'){ 
            this.carouselArray.unshift(this.carouselArray.pop());
        }else{
            this.carouselArray.push(this.carouselArray.shift());
        }
        this.updateGallery();
    }
    
    setControls(){
        this.carouselControls.forEach(control => {
            const button = document.createElement('button');
            button.className = `gallery-controls-${control}`;
            button.innerText = control;
            galleryControlsContainer.appendChild(button);
        });

    
}


   useControls() {
    const triggers = [...galleryControlsContainer.querySelectorAll('button')];
    triggers.forEach(control => {
        control.addEventListener('click', e => {
            e.preventDefault();
            this.setCurrentState(control);
        });
    });
    
    const cards = [...galleryContainer.querySelectorAll('.card')];
    cards.forEach(card => {
        card.addEventListener('click', () => {
            let clickedCardIndex = this.carouselArray.indexOf(card);
            this.carouselArray = [...this.carouselArray.slice(clickedCardIndex), ...this.carouselArray.slice(0, clickedCardIndex)];
            this.updateGallery();
        });
    });
}

}

const exampleCarousel = new Carousel(galleryContainer, galleryItems, galleryControls);

exampleCarousel.setControls();
exampleCarousel.useControls();



