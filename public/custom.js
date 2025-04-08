function createSearchBox() {
  const searchBox = document.createElement('div');
  searchBox.id = 'searchBox';
  Object.assign(searchBox.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    zIndex: '1000',
    backgroundColor: 'white'
  });

  const searchInput = document.createElement('input');
  searchInput.id = 'searchInput';
  searchInput.placeholder = 'Search...';
  Object.assign(searchInput.style, {
    padding: '5px',
    marginRight: '5px'
  });

  const searchButton = document.createElement('button');
  searchButton.id = 'searchButton';
  searchButton.textContent = 'Search';
  Object.assign(searchButton.style, {
    padding: '5px 10px',
    cursor: 'pointer',
    marginLeft: '5px' // Add space between the buttons
  });

  const clickAllButton = document.createElement('button');
  clickAllButton.id = 'clickAllButton';
  clickAllButton.textContent = '↓';
  Object.assign(clickAllButton.style, {
    padding: '5px 10px',
    cursor: 'pointer',
  });

  searchButton.addEventListener('click', triggerSearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      triggerSearch();
    }
  });

    // Toggle function for simulating clicks on all elements
    clickAllButton.addEventListener('click', () => {
      const elements = document.querySelectorAll('.opblock-tag.no-desc');
      const allClosed = Array.from(elements).every(element => element.getAttribute('data-is-open') === 'false');
      
      // If all elements are closed, open all
      if (allClosed) elements.forEach(element => element.click());
      
      elements.forEach(element => {
          if (element.getAttribute('data-is-open') === 'true') element.click();
        });
    });
  

  let currentIndex = -1; // Keeps track of the current element in the search results
  let searchResults = []; // Stores the matched elements

  function triggerSearch() {
    const value = searchInput.value.trim();
    if (value) {
      // Format the input by splitting and capitalizing each word
      const formattedValue = value
        .split(' ') // Split by spaces
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join('_'); // Join words with underscores
    
      // Get all elements with IDs starting with 'operations-tag-'
      const allTags = document.querySelectorAll('[id^="operations-tag-"]');
    
      searchResults = []; // Clear previous results
      let found = false;

      // Find all matching elements
      allTags.forEach(tag => {
        const tagId = tag.id;
        if (tagId.toLowerCase().includes(formattedValue.toLowerCase())) {
          searchResults.push(tag); // Add the matched tag to the results array
          found = true;
        }
      });

      if (found) {
        navigateToNextResult();
      } else {
        alert(`No element found matching: ${formattedValue}`);
      }
    }
  }

  function navigateToNextResult() {
    if (searchResults.length === 0) return; // If no results, do nothing
    
    // Increment the index in a circular manner
    currentIndex = (currentIndex + 1) % searchResults.length;

    // Scroll to the matched element
    const target = searchResults[currentIndex];
    target.scrollIntoView({ behavior: 'smooth' });
  }

  // Append elements to the search box
  searchBox.appendChild(searchInput);
  searchBox.appendChild(clickAllButton); // Add the new button for "Click All"
  searchBox.appendChild(searchButton);
  document.body.appendChild(searchBox);
}
let searchBoxVisible = false; // Keeps track of whether the search box is visible or not

  // Toggle the visibility of the search box
  function toggleSearchBox() {
    searchBoxVisible = !searchBoxVisible;
    searchBox.style.display = searchBoxVisible ? 'block' : 'none';
    if (searchBoxVisible) {
      searchInput.focus(); // Focus on the search input when the box is shown
    }  
  }

  // Listen for Ctrl + Shift + F to toggle the search box
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      toggleSearchBox();
    }
  });

createSearchBox();