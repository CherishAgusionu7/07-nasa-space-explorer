// Find key elements on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');
const spaceFactText = document.getElementById('spaceFactText');
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalVideoLink = document.getElementById('modalVideoLink');
const modalVideoAnchor = document.getElementById('modalVideoAnchor');
const modalExplanation = document.getElementById('modalExplanation');
const modalBackdrop = document.querySelector('.modal-backdrop');

// NASA API endpoint and demo key (good for classroom projects)
const nasaBaseUrl = 'https://api.nasa.gov/planetary/apod';
const apiKey = 'DEMO_KEY';
let currentGalleryItems = [];
let lastFocusedElement = null;

// Fun facts shown each time the app refreshes
const spaceFacts = [
	'One day on Venus is longer than one year on Venus.',
	'Neutron stars can spin at a rate of hundreds of rotations each second.',
	'The footprints on the Moon can last for millions of years.',
	'Jupiter has the shortest day of all planets, at just under 10 hours.',
	'The International Space Station travels around Earth about every 90 minutes.',
	'There are more stars in the universe than grains of sand on Earth.'
];

// Set up the date inputs using the helper from dateRange.js
setupDateInputs(startInput, endInput);

// Pick and display one random space fact each page load
function showRandomSpaceFact() {
	const randomIndex = Math.floor(Math.random() * spaceFacts.length);
	spaceFactText.textContent = spaceFacts[randomIndex];
}

showRandomSpaceFact();

// Show a loading message while we wait for data
function showLoadingState() {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">🔄</div>
			<p>Loading space photos...</p>
		</div>
	`;
}

// Show a friendly error message if something goes wrong
function showErrorState(message) {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">⚠️</div>
			<p>${message}</p>
		</div>
	`;
}

// Build one gallery card for each APOD item
function createGalleryCard(item, index) {
	const previewImage = item.media_type === 'video' ? item.thumbnail_url : item.url;
	const mediaLabel = item.media_type === 'video' ? 'Video' : 'Image';
	const videoLinkMarkup =
		item.media_type === 'video'
			? `<p><a href="${item.url}" target="_blank" rel="noopener noreferrer">Open video</a></p>`
			: '';

	return `
		<article class="gallery-item" data-index="${index}" tabindex="0">
			<img src="${previewImage}" alt="${item.title}" />
			<p><strong>${mediaLabel}</strong></p>
			<p><strong>${item.title}</strong></p>
			<p>${item.date}</p>
			${videoLinkMarkup}
		</article>
	`;
}

// Open the modal and fill it with the selected APOD details
function openModal(item) {
	console.log('[Modal Debug] NASA item clicked:', item);
	console.log('[Modal Debug] modal element:', imageModal);
	console.log('[Modal Debug] modal image element:', modalImage);
	console.log('[Modal Debug] modal title element:', modalTitle);
	console.log('[Modal Debug] modal date element:', modalDate);
	console.log('[Modal Debug] modal explanation element:', modalExplanation);

	if (!item || typeof item !== 'object') {
		console.error('[Modal Debug] No valid NASA item was provided to openModal.');
		return;
	}

	if (!imageModal || !modalImage || !modalTitle || !modalDate || !modalExplanation) {
		console.error('[Modal Debug] One or more modal elements are missing in index.html.');
		return;
	}

	lastFocusedElement = document.activeElement;

	const modalPreviewImage = item.media_type === 'video'
		? item.thumbnail_url
		: (item.hdurl || item.url);
	const hasPreviewImage = Boolean(modalPreviewImage);

	// Assign all content before showing the modal.
	modalImage.src = hasPreviewImage ? modalPreviewImage : '';
	modalImage.alt = item.title || 'NASA APOD media';
	modalImage.classList.toggle('hidden', !hasPreviewImage);
	modalTitle.textContent = item.title || 'Untitled APOD entry';
	modalDate.textContent = item.date || 'Date unavailable';
	modalExplanation.textContent = item.explanation || 'No NASA explanation is available for this entry.';

	if (item.media_type === 'video') {
		modalVideoAnchor.href = item.url;
		modalVideoLink.classList.remove('hidden');
	} else {
		modalVideoAnchor.href = '#';
		modalVideoLink.classList.add('hidden');
	}

	imageModal.classList.remove('hidden');
	imageModal.setAttribute('aria-hidden', 'false');
	imageModal.inert = false;
	closeModalButton.focus();
}

// Close and reset the modal content
function closeModal() {
	const focusTarget =
		lastFocusedElement instanceof HTMLElement && document.contains(lastFocusedElement)
			? lastFocusedElement
			: getImagesButton;

	if (imageModal.contains(document.activeElement)) {
		focusTarget.focus();
	}

	imageModal.classList.add('hidden');
	imageModal.setAttribute('aria-hidden', 'true');
	imageModal.inert = true;
	modalImage.src = '';
	modalImage.classList.remove('hidden');
	modalVideoAnchor.href = '#';
	modalVideoLink.classList.add('hidden');
	lastFocusedElement = null;
}

// Handle click and keyboard interaction on gallery cards
function handleGallerySelection(event) {
	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	const selectedIndex = Number(card.dataset.index);
	const selectedItem = currentGalleryItems[selectedIndex];

	console.log('[Modal Debug] selected card index:', selectedIndex);
	console.log('[Modal Debug] selected NASA item passed to openModal:', selectedItem);

	if (selectedItem) {
		openModal(selectedItem);
	} else {
		console.error('[Modal Debug] No NASA item found for selected card index.');
	}
}

// Fetch APOD data from NASA for the selected date range
async function fetchApodByDateRange() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		showErrorState('Please select both a start date and an end date.');
		return;
	}

	if (startDate > endDate) {
		showErrorState('Start date must be before or equal to the end date.');
		return;
	}

	showLoadingState();

	try {
		const query = `?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;
		const response = await fetch(`${nasaBaseUrl}${query}`);

		if (!response.ok) {
			throw new Error(`NASA API request failed: ${response.status}`);
		}

		const data = await response.json();

		// APOD can return one object or an array. We normalize to an array.
		const items = Array.isArray(data) ? data : [data];

		// Keep entries with supported media and a preview image.
		const galleryItems = items.filter((item) => {
			if (item.media_type === 'image') {
				return Boolean(item.url);
			}

			if (item.media_type === 'video') {
				return Boolean(item.thumbnail_url) && Boolean(item.url);
			}

			return false;
		});

		if (galleryItems.length === 0) {
			showErrorState('No viewable APOD entries found for this date range. Try another range.');
			return;
		}

		// Show newest content first
		galleryItems.sort((a, b) => (a.date < b.date ? 1 : -1));
		currentGalleryItems = galleryItems;

		gallery.innerHTML = galleryItems.map((item, index) => createGalleryCard(item, index)).join('');
	} catch (error) {
		showErrorState('Could not load NASA images right now. Please try again.');
		console.error(error);
	}
}

// Fetch images when the user clicks the button
getImagesButton.addEventListener('click', fetchApodByDateRange);

// Open modal when a user clicks a gallery card
gallery.addEventListener('click', handleGallerySelection);

// Open modal when pressing Enter on a focused gallery card
gallery.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		handleGallerySelection(event);
	}
});

// Close modal interactions
closeModalButton.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !imageModal.classList.contains('hidden')) {
		closeModal();
	}
});

// Keep modal unfocusable while hidden.
imageModal.inert = true;
