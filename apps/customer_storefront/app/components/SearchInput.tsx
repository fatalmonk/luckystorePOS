/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useCartStore } from '../stores/useCartStore';
import { useRouter } from 'next/router';
import Image from 'next/image';

const SearchInput = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const router = useRouter();
  const { searchExpanded, toggleSearchExpanded } = useUIStore();
  const { addItem } = useCartStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim() === '') return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${searchQuery}`);
      const data = await response.json();
      setSearchResults(data);
      setIsEmpty(data.length === 0);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      toggleSearchExpanded();
    }
  };

  const handleOutsideClick = (e) => {
    if (e.target.closest('.search-input') === null) {
      toggleSearchExpanded();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div className={`search-input ${searchExpanded ? 'expanded' : ''}`}> 
      <form onSubmit={handleSearch}> 
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
        />
        <button type="submit"> 
          <Image src="/search-icon.svg" alt="Search icon" width={16} height={16} /> 
        </button>
        {isLoading ? ( 
          <div className="loading-state"> 
            <Image src="/loading-icon.svg" alt="Loading icon" width={16} height={16} />
          </div>
        ) : null}
        {isEmpty ? ( 
          <div className="empty-state"> 
            <p>No products found for '{searchQuery}'</p>
            <p>Suggested search topics: milk, rice, snacks</p>
            <button onClick={() => router.push('/categories')}> 
              Browse All Categories 
            </button>
          </div>
        ) : null}
        {searchResults.length > 0 ? ( 
          <ul className="search-results"> 
            {searchResults.map((result) => ( 
              <li key={result.id}> 
                <Image src={result.image} alt={result.name} width={40} height={40} />
                <p>{result.name}</p>
                <p>{result.price}</p>
                <button onClick={() => addItem(result)}>Add to Cart</button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  );
};

export default SearchInput;
