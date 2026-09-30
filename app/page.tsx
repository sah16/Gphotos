'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { Photo } from '@/lib/retrieval';
import { Chip } from '@/lib/chips';

import Header from '@/components/Header';
import SummaryLine from '@/components/SummaryLine';
import ChipRow from '@/components/ChipRow';
import ResultCountLine from '@/components/ResultCountLine';
import PhotoGrid from '@/components/PhotoGrid';
import RelatedRow from '@/components/RelatedRow';
import SearchBar from '@/components/SearchBar';

export default function Home() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [results, setResults] = useState<Photo[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = async (newQuery: string, chipsToUse: string[] = []) => {
    setIsLoading(true);
    try {
      const endpoint = chipsToUse.length > 0 ? '/api/refine' : '/api/search';
      const body = chipsToUse.length > 0 
        ? { query: newQuery, selectedChips: chipsToUse }
        : { query: newQuery };
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      setResults(data.results || []);
      setChips(data.chips || []);
      setActiveQuery(newQuery);
      setHasSearched(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSelectedChips([]);
    performSearch(query, []);
  };

  const handleChipToggle = (chipLabel: string) => {
    const newChips = selectedChips.includes(chipLabel)
      ? selectedChips.filter(c => c !== chipLabel)
      : [...selectedChips, chipLabel];
    
    setSelectedChips(newChips);
    performSearch(activeQuery, newChips);
  };

  const handleClearClues = () => {
    setSelectedChips([]);
    performSearch(activeQuery, []);
  };

  const handleBack = () => {
    setHasSearched(false);
    setQuery('');
    setActiveQuery('');
    setSelectedChips([]);
    setResults([]);
    setChips([]);
  };

  return (
    <div className={styles.container}>
      {hasSearched ? (
        <div className={styles.resultsScreen}>
          <Header title={activeQuery} onBack={handleBack} />
          <div className={styles.scrollableContent}>
            <SummaryLine query={activeQuery} selectedChips={selectedChips} />
            <ChipRow 
              chips={chips} 
              selectedChips={selectedChips} 
              onToggle={handleChipToggle} 
            />
            {isLoading ? (
               <div className={styles.loading}>Loading results...</div>
            ) : (
               <>
                 <ResultCountLine 
                   count={results.length} 
                   cluesCount={selectedChips.length} 
                   onClearClues={handleClearClues} 
                 />
                 <PhotoGrid photos={results} />
                 <RelatedRow />
               </>
            )}
          </div>
          <SearchBar 
            query={query} 
            setQuery={setQuery} 
            onSubmit={handleSearchSubmit} 
            placeholder="Nothing fits? Type your own clue"
          />
        </div>
      ) : (
        <div className={styles.initialScreen}>
          <div className={styles.homeContent}>
             <div className={styles.logo}>Google Photos MVP</div>
             <p className={styles.homePrompt}>Search for photos, people, or places</p>
          </div>
          <SearchBar 
            query={query} 
            setQuery={setQuery} 
            onSubmit={handleSearchSubmit} 
            placeholder="Search or follow up"
          />
        </div>
      )}
    </div>
  );
}
