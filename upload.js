// Cloudinary configuration
const cloudinaryConfig = {
    cloudName: 'dqkosqeke', // Replace with your cloud name
    uploadPreset: 'motorcycle_parts' // Replace with your upload preset
};

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInfo = document.getElementById('fileInfo');
const imagePreview = document.getElementById('imagePreview');
const previewImg = imagePreview.querySelector('img');
const removePreview = document.getElementById('removePreview');
const imageName = document.getElementById('imageName');
const imageTags = document.getElementById('imageTags');
const imageCategory = document.getElementById('imageCategory');
const imageDescription = document.getElementById('imageDescription');
const uploadBtn = document.getElementById('uploadBtn');
const successMessage = document.getElementById('successMessage');
const themeToggle = document.getElementById('themeToggle');

// Initialize upload page
function initUploadPage() {
    loadThemePreference();
    setupEventListeners();
    
    // Attach Upload Another button listener
    const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
    if (uploadAnotherBtn) {
        uploadAnotherBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Upload Another clicked');
            resetForm();
        });
        console.log('Upload Another button listener attached');
    }
}

// Setup event listeners
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop functionality
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('dragleave', handleDragLeave);
    fileUploadArea.addEventListener('drop', handleFileDrop);

    // Remove preview
    removePreview.addEventListener('click', removeImagePreview);

    // Form submission
    uploadForm.addEventListener('submit', handleFormSubmit);

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Upload Another button
    document.addEventListener('DOMContentLoaded', function() {
        const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
        if (uploadAnotherBtn) {
            uploadAnotherBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                resetForm();
            });
        }
    });

    // Auto-fill name when file is selected
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileName = this.files[0].name.replace(/\.[^/.]+$/, ""); // Remove extension
            imageName.value = fileName.replace(/[-_]/g, ' '); // Replace underscores and dashes with spaces
        }
    });
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processSelectedFile(file);
    }
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
}

// Handle file drop
function handleFileDrop(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        fileInput.files = e.dataTransfer.files;
        processSelectedFile(file);
    } else {
        alert('Please drop a valid image file (PNG, JPG, WEBP)');
    }
}

// Process selected file
function processSelectedFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (PNG, JPG, WEBP, GIF)');
        return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    fileInfo.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

    // Show image preview
    const reader = new FileReader();
    reader.onload = function (e) {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Remove image preview
function removeImagePreview() {
    fileInput.value = '';
    fileInfo.textContent = 'No file selected';
    imagePreview.style.display = 'none';
    imageName.value = '';
}

// Handle form submission
// In upload.js - Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!fileInput.files.length) {
        alert('Please select an image to upload');
        return;
    }

    if (!imageName.value.trim()) {
        alert('Please enter a name for your part');
        return;
    }

    if (!imageCategory.value) {
        alert('Please select a category for your part');
        return;
    }

    const file = fileInput.files[0];

    // Show loading state on button
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('cloud_name', cloudinaryConfig.cloudName);

        // Upload to Cloudinary
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cloudinary error response:', response.status, errorText);
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Cloudinary upload response:', data);
        console.log('Image URL:', data.secure_url);

        // Create new image object with Cloudinary URL
        const newImage = {
            id: Date.now(), // Unique ID
            name: imageName.value.trim(),
            tags: imageTags.value.trim(),
            category: imageCategory.value,
            url: data.secure_url, // This is the Cloudinary URL
            public_id: data.public_id,
            description: imageDescription.value.trim(),
            uploadedAt: new Date().toISOString()
        };

        console.log('New image with Cloudinary URL:', newImage);

        // Save to gallery
        saveImageToGallery(newImage);

        // Show success message
        showSuccessMessage();

    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading image. Please check your Cloudinary configuration and try again.');
    } finally {
        // Reset button state
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload to Cloudinary';
    }
}

// Netlify Function endpoint
const GALLERY_API = '/.netlify/functions/gallery';

// Save image metadata to Netlify Function
async function saveImageToGallery(newImage) {
    try {
        const cacheBreaker = `?t=${Date.now()}`; // Add timestamp to bust cache
        // Get current gallery from Netlify
        const res = await fetch(GALLERY_API + cacheBreaker);
        let images = [];
        if (res.ok) {
            images = await res.json();
            if (!Array.isArray(images)) images = [];
        }
        // Add new image to the beginning
        images.unshift(newImage);
        // Save back to Netlify
        await fetch(GALLERY_API + cacheBreaker, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(images)
        });
        console.log('Image metadata saved to Netlify Function. Cloudinary URL:', newImage.url);
        console.log('Total images in gallery:', images.length);
    } catch (err) {
        console.error('Error saving image to Netlify Function:', err);
        alert('Error saving image to gallery. Please try again.');
    }
}

// Show success message
function showSuccessMessage() {
    console.log('Showing success message');
    successMessage.style.display = 'block';
    uploadForm.style.display = 'none';
    
    // Scroll to success message
    setTimeout(() => {
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Reset form for new upload
function resetForm() {
    successMessage.style.display = 'none';
    uploadForm.style.display = 'block';
    uploadForm.reset();
    fileInfo.textContent = 'No file selected';
    imagePreview.style.display = 'none';
}

// Theme functionality
function toggleTheme() {
    document.body.classList.toggle('dark-mode');

    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }

    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }
}

// Make resetForm globally available for the success message buttons
window.resetForm = resetForm;

// Initialize upload page when loaded
document.addEventListener('DOMContentLoaded', initUploadPage);