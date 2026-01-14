// Global error handler to prevent app crashes
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
    return false;
};

// Cloudinary configuration
const cloudinaryConfig = {
    cloudName: 'dqkosqeke', // Replace with your cloud name
    uploadPreset: 'motorcycle_parts' // Replace with your upload preset
};

// Sample initial data for the gallery
const initialImages = [
    {
        id: 1,
        name: "Chrome Saddle Stay",
        tags: "saddle, stay, chrome, motorcycle, custom",
        category: "saddle-stay",
        description: "High-quality chrome plated saddle stay for classic motorcycles",
        url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    },
    {
        id: 2,
        name: "Heavy Duty Crash Guard",
        tags: "crash, guard, protection, steel, heavy-duty",
        category: "crash-guard",
        description: "Robust steel crash guard for maximum motorcycle protection",
        url: "https://images.unsplash.com/photo-1558618666-fcd25856cd63?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    },
    {
        id: 3,
        name: "Aluminum Carrier Rack",
        tags: "carrier, rack, aluminum, luggage, storage",
        category: "carrier-rack",
        description: "Lightweight aluminum carrier rack for extra storage capacity",
        url: "https://images.unsplash.com/photo-1558618667-d72d6bb0233a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    },
    {
        id: 4,
        name: "Performance Exhaust System",
        tags: "exhaust, performance, stainless steel, racing",
        category: "exhaust",
        description: "High-performance exhaust system for enhanced motorcycle sound and power",
        url: "https://images.unsplash.com/photo-1558618666-7a5d0b6d47c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    }
];

// DOM Elements
const galleryEl = document.getElementById('gallery');
const searchInput = document.getElementById('searchInput');
const categoryFilters = document.getElementById('categoryFilters');
const themeToggle = document.getElementById('themeToggle');
const loadingState = document.getElementById('loadingState');
const adminToggle = document.getElementById('adminToggle');

// Modal Elements
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalName = document.getElementById('modalName');
const modalTags = document.getElementById('modalTags');
const modalDescription = document.getElementById('modalDescription');
const closeModal = document.getElementById('closeModal');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// State variables
let images = [];
let filteredImages = [];
let currentCategory = 'all';
let currentSearch = '';
let currentImageIndex = 0;
let currentFilteredImages = [];
let adminMode = false;
let imagesToDelete = [];
let currentEditImageId = null;
let imageProtectionInitialized = false;

// Netlify Function endpoint
const GALLERY_API = '/.netlify/functions/gallery';

// Initialize the gallery
async function initGallery() {
    // Clear any modal states from previous sessions
    localStorage.removeItem('suppressEditModal');
    currentEditImageId = null;

    // Ensure all modals are closed
    closeEditModal();
    closeImageModal();
    closeDeleteModal();

    // Load images from Netlify Function
    try {
        const cacheBreaker = `?t=${Date.now()}`; // Add timestamp to bust cache
        const res = await fetch(GALLERY_API + cacheBreaker);
        if (!res.ok) throw new Error('Failed to fetch gallery data');
        images = await res.json();
        if (!Array.isArray(images)) images = [];
    } catch (err) {
        console.error('Error loading gallery from Netlify Function:', err);
        images = [...initialImages];
    }
    hideLoading();
    renderGallery();

    // Load theme preference
    loadThemePreference();
    // Initialize admin controls
    initAdminControls();
    // Add CSS animations
    addCustomStyles();
    console.log('Gallery initialized successfully');
}

// Save images to Netlify Function
async function saveToNetlifyGallery() {
    try {
        const cacheBreaker = `?t=${Date.now()}`; // Add timestamp to bust cache
        const res = await fetch(GALLERY_API + cacheBreaker, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(images)
        });
        if (!res.ok) throw new Error('Failed to save gallery data');
    } catch (err) {
        console.error('Error saving gallery to Netlify Function:', err);
    }
}

// Render gallery based on current filters
function renderGallery() {
    // Filter images based on search and category
    filteredImages = images.filter(image => {
        const matchesSearch = currentSearch === '' ||
            image.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
            image.tags.toLowerCase().includes(currentSearch.toLowerCase()) ||
            (image.description && image.description.toLowerCase().includes(currentSearch.toLowerCase()));

        const matchesCategory = currentCategory === 'all' || image.category === currentCategory;

        return matchesSearch && matchesCategory;
    });

    // Clear gallery
    galleryEl.innerHTML = '';

    // Show empty state if no images
    if (filteredImages.length === 0) {
        galleryEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>No Fitting Images found</h3>
                <p>Try adjusting your search or upload new Images</p>
                <a href="upload.html" class="upload-link" style="margin-top: 20px; display: inline-flex;">
                    <i class="fas fa-cloud-upload-alt"></i> Upload Fitting Image
                </a>
            </div>
        `;
        return;
    }

    // Create photo cards
    filteredImages.forEach((image, index) => {
        const isSelected = adminMode && imagesToDelete.includes(image.id);
        const photoCard = document.createElement('div');
        photoCard.className = `photo-card ${isSelected ? 'selected' : ''}`;
        photoCard.style.border = isSelected ? '2px solid var(--danger-color)' : '';

        photoCard.innerHTML = `
            ${adminMode ? `
                <button class="image-delete-btn" onclick="event.stopPropagation(); toggleImageSelection(${image.id})">
                    <i class="fas ${isSelected ? 'fa-check' : 'fa-times'}"></i>
                </button>
            ` : ''}
            <button class="edit-btn" onclick="event.preventDefault(); event.stopPropagation(); openEditModal(${image.id})">
                <i class="fas fa-edit"></i>
            </button>
            <div class="protection-overlay"></div>
            <img src="${image.url}" alt="${image.name}" class="photo-img protected-image" loading="lazy">
            <div class="photo-info">
                <div class="photo-name">${image.name}</div>
                <div class="photo-tags">${image.tags}</div>
                ${image.description ? `<div class="photo-description">${image.description}</div>` : ''}
                ${adminMode ? `<div class="admin-info" style="font-size: 0.7rem; opacity: 0.6; margin-top: 5px;">ID: ${image.id}</div>` : ''}
            </div>
        `;

        // Add click event to open modal (only if not in admin mode)
        if (!adminMode) {
            photoCard.addEventListener('click', () => {
                openModal(index);
            });
        }

        galleryEl.appendChild(photoCard);
    });

    // Enable image protection
    enableImageProtection();

    // Update admin stats
    updateAdminStats();
}

// Hide loading state
function hideLoading() {
    if (loadingState) {
        loadingState.style.display = 'none';
    }
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderGallery();
});

// Category filter functionality
categoryFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-btn')) {
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Update current category
        currentCategory = e.target.dataset.category;
        renderGallery();
    }
});

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');

    // Update icon
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }

    // Save theme preference
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Load saved theme preference
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }
}

// Modal Functions
function openModal(imageIndex) {
    if (adminMode) return; // Prevent opening detail modal in admin mode
    currentImageIndex = imageIndex;
    currentFilteredImages = filteredImages;

    const image = currentFilteredImages[currentImageIndex];
    modalImage.src = image.url;
    modalName.textContent = image.name;
    modalTags.textContent = image.tags;
    modalDescription.textContent = image.description || '';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    updateNavButtons();
}

function closeImageModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showPrevImage() {
    if (currentFilteredImages.length > 1) {
        currentImageIndex = (currentImageIndex - 1 + currentFilteredImages.length) % currentFilteredImages.length;
        const image = currentFilteredImages[currentImageIndex];
        modalImage.src = image.url;
        modalName.textContent = image.name;
        modalTags.textContent = image.tags;
        modalDescription.textContent = image.description || '';
        updateNavButtons();
    }
}

function showNextImage() {
    if (currentFilteredImages.length > 1) {
        currentImageIndex = (currentImageIndex + 1) % currentFilteredImages.length;
        const image = currentFilteredImages[currentImageIndex];
        modalImage.src = image.url;
        modalName.textContent = image.name;
        modalTags.textContent = image.tags;
        modalDescription.textContent = image.description || '';
        updateNavButtons();
    }
}

function updateNavButtons() {
    if (currentFilteredImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    }
}

// Event Listeners for modal
closeModal.addEventListener('click', closeImageModal);
prevBtn.addEventListener('click', showPrevImage);
nextBtn.addEventListener('click', showNextImage);

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeImageModal();
    }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'block') {
        if (e.key === 'Escape') {
            closeImageModal();
        } else if (e.key === 'ArrowLeft') {
            showPrevImage();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        }
    }
});

// Image Protection Functions
function enableImageProtection() {
    if (imageProtectionInitialized) return;
    imageProtectionInitialized = true;

    // Disable right-click context menu on images
    document.addEventListener('contextmenu', function (e) {
        if (e.target.classList.contains('photo-img') ||
            e.target.classList.contains('modal-content') ||
            e.target.closest('.photo-card')) {
            e.preventDefault();
            showProtectionWarning();
            return false;
        }
    });

    // Disable drag and drop
    document.addEventListener('dragstart', function (e) {
        if (e.target.classList.contains('photo-img') ||
            e.target.classList.contains('modal-content')) {
            e.preventDefault();
            return false;
        }
    });

    // Add protection attributes to images
    const imageEls = document.querySelectorAll('.photo-img, .modal-content');
    imageEls.forEach(img => {
        img.classList.add('protected-image');
        img.setAttribute('draggable', 'false');
    });

    // Prevent keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Disable Ctrl+S (Save)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            showProtectionWarning();
            return false;
        }
        // Disable Ctrl+P (Print)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            showProtectionWarning();
            return false;
        }
        // Disable Print Screen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            showProtectionWarning();
            return false;
        }
    });
}

function showProtectionWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--warning-color);
        color: #000;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: var(--shadow);
        animation: slideInRight 0.3s ease;
    `;
    warning.innerHTML = '<i class="fas fa-shield-alt"></i> Image protection enabled';
    document.body.appendChild(warning);

    setTimeout(() => {
        warning.remove();
    }, 3000);
}

// Edit Functionality
function openEditModal(imageId) {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    currentEditImageId = imageId;

    // Populate form with current data
    const previewImg = document.getElementById('editImagePreview');
    if (previewImg) {
        previewImg.src = image.url;
        previewImg.style.display = 'block';
        // Clear any previous replacement data
        delete previewImg.dataset.newUrl;
        delete previewImg.dataset.publicId;
    }

    document.getElementById('editImageName').value = image.name || '';
    document.getElementById('editImageTags').value = image.tags || '';
    document.getElementById('editImageCategory').value = image.category || 'saddle-stay';
    document.getElementById('editImageDescription').value = image.description || '';

    // Show the modal
    document.getElementById('editModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Setup image replacement handler
    const editImageFile = document.getElementById('editImageFile');
    editImageFile.value = ''; // Reset file input
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditImageId = null;
}

function saveEditChanges() {
    if (!currentEditImageId) return;

    const imageIndex = images.findIndex(img => img.id === currentEditImageId);
    if (imageIndex === -1) return;

    // Get updated values
    const updatedName = document.getElementById('editImageName').value.trim();
    const updatedTags = document.getElementById('editImageTags').value.trim();
    const updatedCategory = document.getElementById('editImageCategory').value;
    const updatedDescription = document.getElementById('editImageDescription').value.trim();

    if (!updatedName) {
        alert('Please enter a name for the part');
        return;
    }

    // Check if image was replaced
    const editImagePreview = document.getElementById('editImagePreview');
    const newImageUrl = editImagePreview.dataset.newUrl;
    const newPublicId = editImagePreview.dataset.publicId;

    // Update image data
    images[imageIndex] = {
        ...images[imageIndex],
        name: updatedName,
        tags: updatedTags,
        category: updatedCategory,
        description: updatedDescription,
        ...(newImageUrl && { url: newImageUrl }),
        ...(newPublicId && { public_id: newPublicId })
    };

    // Save to Netlify Function
    saveToNetlifyGallery();

    // Re-render gallery
    renderGallery();

    // Close modal
    closeEditModal();

    // Show success message
    showNotification('Part updated successfully', 'success');
}

// Handle image replacement in edit modal
async function handleImageReplacement(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    try {
        // Show loading state
        const editImagePreview = document.getElementById('editImagePreview');
        editImagePreview.style.opacity = '0.5';

        // Create FormData for Cloudinary upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('cloud_name', cloudinaryConfig.cloudName);

        // Upload to Cloudinary
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
            {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();

        // Update preview
        editImagePreview.src = data.secure_url;
        editImagePreview.style.opacity = '1';

        // Store the new URL to be saved when form is submitted
        editImagePreview.dataset.newUrl = data.secure_url;
        editImagePreview.dataset.publicId = data.public_id;

    } catch (error) {
        console.error('Image replacement error:', error);
        alert('Failed to upload image. Please try again.');
        const editImagePreview = document.getElementById('editImagePreview');
        editImagePreview.style.opacity = '1';
    }
}

// Admin Controls Functions
function initAdminControls() {
    if (!adminToggle) {
        console.warn('adminToggle element not found, skipping admin controls initialization');
        return;
    }
    // Add event listener for admin toggle
    adminToggle.addEventListener('click', toggleAdminMode);
}

function toggleAdminMode() {
    adminMode = !adminMode;
    const adminControls = document.getElementById('adminControls');

    if (adminMode) {
        adminToggle.classList.add('admin-active');
        adminControls.style.display = 'block';
        updateAdminStats();
    } else {
        adminToggle.classList.remove('admin-active');
        adminControls.style.display = 'none';
        clearSelection();
    }

    renderGallery();
}

function toggleImageSelection(imageId) {
    const index = imagesToDelete.indexOf(imageId);
    if (index > -1) {
        imagesToDelete.splice(index, 1);
    } else {
        imagesToDelete.push(imageId);
    }
    updateAdminStats();
    renderGallery();
}

function clearSelection() {
    imagesToDelete = [];
    updateAdminStats();
}

function updateAdminStats() {
    const imageCount = document.getElementById('imageCount');
    const selectedCount = document.getElementById('selectedCount');

    if (imageCount && selectedCount) {
        imageCount.textContent = images.length;
        selectedCount.textContent = imagesToDelete.length;
    }
}

function showDeleteModal(type) {
    const modal = document.getElementById('deleteModal');
    const message = document.getElementById('deleteModalMessage');

    if (type === 'all') {
        message.textContent = `Are you sure you want to delete ALL ${images.length} images? This action cannot be undone.`;
        modal.dataset.deleteType = 'all';
    } else if (type === 'selected') {
        if (imagesToDelete.length === 0) {
            alert('Please select images to delete first.');
            return;
        }
        message.textContent = `Are you sure you want to delete ${imagesToDelete.length} selected images? This action cannot be undone.`;
        modal.dataset.deleteType = 'selected';
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function confirmDelete() {
    const modal = document.getElementById('deleteModal');
    const deleteType = modal.dataset.deleteType;

    // Cloudinary delete function
    async function deleteFromCloudinary(publicId) {
        if (!publicId) {
            console.warn('No public_id found for image, skipping Cloudinary delete');
            return;
        }

        try {
            // Use destroy method with upload preset
            const formData = new FormData();
            formData.append('public_id', publicId);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`Cloudinary delete failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Cloudinary delete successful:', result);
            return result;

        } catch (err) {
            console.error('Cloudinary delete error:', err);
            // Continue with local deletion even if Cloudinary fails
        }
    }

    try {
        if (deleteType === 'all') {
            // Delete all images from Cloudinary
            const imagesWithPublicIds = images.filter(img => img.public_id);
            console.log(`Deleting ${imagesWithPublicIds.length} images from Cloudinary`);

            for (const img of imagesWithPublicIds) {
                await deleteFromCloudinary(img.public_id);
            }

            images = [];
            showNotification('All images deleted successfully', 'success');

        } else if (deleteType === 'selected') {
            // Delete selected images from Cloudinary
            const selectedImages = images.filter(img => imagesToDelete.includes(img.id));
            const imagesWithPublicIds = selectedImages.filter(img => img.public_id);

            console.log(`Deleting ${imagesWithPublicIds.length} selected images from Cloudinary`);

            // Delete from Cloudinary first
            for (const img of imagesWithPublicIds) {
                await deleteFromCloudinary(img.public_id);
            }

            // Then remove from local storage
            const originalCount = images.length;
            images = images.filter(image => !imagesToDelete.includes(image.id));
            const deletedCount = originalCount - images.length;
            imagesToDelete = [];

            showNotification(`${deletedCount} images deleted successfully`, 'success');
        }

        // Save to Netlify Function
        saveToNetlifyGallery();

        renderGallery();
        updateAdminStats();
        closeDeleteModal();

        // Auto-exit admin mode if no images left
        if (images.length === 0) {
            toggleAdminMode();
        }

    } catch (error) {
        console.error('Delete operation error:', error);
        showNotification('Error during deletion process', 'error');
    }
}

function resetGallery() {
    if (confirm('Reset gallery to default sample images? This will remove all uploaded images.')) {
        images = [...initialImages];
        saveToNetlifyGallery();
        renderGallery();
        updateAdminStats();
        showNotification('Gallery reset to default images', 'success');
    }
}

function exportGalleryData() {
    const dataStr = JSON.stringify(images, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'motorcycle-gallery-backup.json';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Gallery data exported successfully', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--accent-color)'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: var(--shadow);
        animation: slideInRight 0.3s ease;
    `;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i> ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .admin-info {
            font-size: 0.7rem;
            opacity: 0.6;
            margin-top: 5px;
        }
    `;
    document.head.appendChild(style);
}

// Close edit modal when clicking outside
document.addEventListener('click', function (e) {
    const editModal = document.getElementById('editModal');
    if (editModal && e.target === editModal) {
        closeEditModal();
    }
});

// Close delete modal when clicking outside
document.addEventListener('click', function (e) {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal && e.target === deleteModal) {
        closeDeleteModal();
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const editModal = document.getElementById('editModal');
        if (editModal && editModal.style.display === 'flex') {
            closeEditModal();
        }

        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal && deleteModal.style.display === 'block') {
            closeDeleteModal();
        }

        if (modal.style.display === 'block') {
            closeImageModal();
        }
    }
});

// Add event listener for edit image file input
document.addEventListener('DOMContentLoaded', function () {
    const editImageFile = document.getElementById('editImageFile');
    if (editImageFile) {
        editImageFile.addEventListener('change', handleImageReplacement);
    }
});

// (Debug panel removed) Raw gallery JSON debug panel and automatic updater removed so
// the gallery JSON will no longer be appended to the page in production.

// Initialize the gallery when page loads
document.addEventListener('DOMContentLoaded', initGallery);