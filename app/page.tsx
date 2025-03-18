"use client";

import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import Settings from '@/components/Settings';
import TerminalHeader from '../components/TerminalHeader';
import TerminalOutput from '../components/TerminalOutput';
import CommandInput from '../components/CommandInput';
import FilterBar from '../components/FilterBar';
import StatusBar from '../components/StatusBar';
import { CommandHistoryEntry, FileResult, SearchResponse } from '../components/types';
import axios from 'axios';
import { ApplicationSettings } from '@/components/Settings';
import { useRootPath } from '../context/RootPathContext';
import App from 'next/app';

const TerminalFileSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([
    { type: 'system', content: 'Welcome v1.0.0' },
    { type: 'system', content: 'Type "help" for available commands' },
  ]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [appSettings, setAppSettings] = useState<ApplicationSettings>({
    apiKey: '',
    theme: 'system',
    folderPaths: {
      documents: '',
      root: '',
      images: '',
      downloads: '',
      other: ''
    },
    preferences: {
      showCodeWhenUsingDataAnalyst: true,
      showFollowUpSuggestions: true,
      archiveChats: false
    },
    language: 'auto-detect'
  });


  // Simulate a blinking cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Load settings from localStorage when component mounts
  useEffect(() => {
    const savedSettings = localStorage.getItem('Settings');
    if (savedSettings) {
      try {
        setAppSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  const saveSettings = (newSettings: ApplicationSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('Settings', JSON.stringify(newSettings));

    // Notify user that settings were saved
    setCommandHistory(prev => [...prev, {
      type: 'system',
      content: 'Settings updated successfully!'
    }]);
  };

  const performSearch = async (query: string, filters: string[] = [], type: string) => {
    setIsLoading(true);

    try {
      // Add a system message showing we're searching
      setCommandHistory(prev => [
        ...prev,
        {
          type: 'system',
          content: `Searching for "${query}"${filters.length > 0 ? ` with filters: ${filters.join(', ')}` : ''}...`,
          isLoading: true
        }
      ]);

      let endpoint = '';
      if (type === 'cmd') {
        endpoint = '/cmd';
      } else if (type === 'find') {
        endpoint = '/find';
      } else if (type === 'search') {
        endpoint = '/search';
      } else {
        throw new Error(`Unsupported search type: ${type}`);
      }

      const rootPath  = appSettings.folderPaths.root;
      const safeRootPath = rootPath ? rootPath.replace(/\\/g, '\\\\') : '';
      
      const response = await axios.post(`http://127.0.0.1:8000${endpoint}`, {
        query,
        base_path: safeRootPath, 
        filters,
      }, {
        headers: appSettings.apiKey ? {
          'Authorization': `Bearer ${appSettings.apiKey}`
        } : {}
      });

      const data: SearchResponse = response.data;

      // Update keywords state
      setKeywords(data.keywords || []);

      // Update command history with results
      setCommandHistory(prev => [
        ...prev.slice(0, -1), // Remove the loading message
        {
          type: 'system',
          content: `Results for "${query}":`,
          isLoading: false
        },
        {
          type: 'results',
          content: data.results || [],
          keywords: data.keywords || []
        }
      ]);
    } catch (error) {
      console.error('Search error:', error);
      setCommandHistory(prev => [
        ...prev.slice(0, -1), // Remove the loading message
        {
          type: 'system',
          content: `Error searching for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          isLoading: false,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Add user command to history
    setCommandHistory(prev => [...prev, { type: 'user', content: searchQuery }]);

    // Simulate processing
    setIsTyping(true);

    // Process command based on what it starts with
    if (searchQuery.toLowerCase() === 'help') {
      setTimeout(() => {
        setCommandHistory(prev => [...prev, {
          type: 'system',
          content: `Available commands:
search [query] - Search for files
Find [query] - Search for files
cmd [query] - Search for files
filter [type] - Filter by file type (e.g., file, folder)
clear - Clear terminal history
keywords - Show detected keywords from last search
settings - Open settings panel
help - Show this help message`
        }]);
        setIsTyping(false);
        setSearchQuery('');
      }, 300);
    } else if (searchQuery.toLowerCase() === 'clear') {
      setTimeout(() => {
        setCommandHistory([
          { type: 'system', content: 'Terminal cleared' },
          { type: 'system', content: 'Type "help" for available commands' }
        ]);
        setIsTyping(false);
        setSearchQuery('');
      }, 300);
    } else if (searchQuery.toLowerCase() === 'keywords') {
      setTimeout(() => {
        if (keywords.length > 0) {
          setCommandHistory(prev => [...prev, {
            type: 'system',
            content: `Detected keywords from last search: ${keywords.join(', ')}`
          }]);
        } else {
          setCommandHistory(prev => [...prev, {
            type: 'system',
            content: 'No keywords available. Try searching for something first.'
          }]);
        }
        setIsTyping(false);
        setSearchQuery('');
      }, 300);
    } else if (searchQuery.toLowerCase() === 'settings') {
      // Just add a message to indicate settings can be accessed via button
      setTimeout(() => {
        setCommandHistory(prev => [...prev, {
          type: 'system',
          content: 'Settings can be accessed by clicking the gear icon in the bottom right corner.'
        }]);
        setIsTyping(false);
        setSearchQuery('');
      }, 300);
    } else if (searchQuery.toLowerCase().startsWith('search ')) {
      const query = searchQuery.substring(7);
      setIsTyping(false);
      setSearchQuery('');
      await performSearch(query, activeFilters, "search");
    } else if (searchQuery.toLowerCase().startsWith('find ')) {
      const query = searchQuery.substring(7);
      setIsTyping(false);
      setSearchQuery('');
      await performSearch(query, activeFilters, "find");
    } else if (searchQuery.toLowerCase().startsWith('cmd ')) {
      const query = searchQuery.substring(7);
      setIsTyping(false);
      setSearchQuery('');
      await performSearch(query, activeFilters, "cmd");
    } else if (searchQuery.toLowerCase().startsWith('filter ')) {
      const filter = searchQuery.substring(7).trim();
      setTimeout(() => {
        if (filter) {
          if (activeFilters.includes(filter)) {
            setActiveFilters(prev => prev.filter(f => f !== filter));
            setCommandHistory(prev => [...prev, {
              type: 'system',
              content: `Removed filter: ${filter}`
            }]);
          } else {
            setActiveFilters(prev => [...prev, filter]);
            setCommandHistory(prev => [...prev, {
              type: 'system',
              content: `Added filter: ${filter}`
            }]);
          }
        } else {
          setCommandHistory(prev => [...prev, {
            type: 'system',
            content: `Active filters: ${activeFilters.length > 0 ? activeFilters.join(', ') : 'None'}`
          }]);
        }
        setIsTyping(false);
        setSearchQuery('');
      }, 300);
    } else {
      setTimeout(() => {
        setCommandHistory(prev => [...prev, {
          type: 'system',
          content: `Command not recognized: ${searchQuery}
Type "help" for available commands`
        }]);
        setIsTyping(false);
        setSearchQuery('');
      }, 300);
    }
  };

  const handleFilterClick = (filter: string) => {
    if (activeFilters.includes(filter)) {
      setActiveFilters(prev => prev.filter(f => f !== filter));
      setCommandHistory(prev => [...prev, {
        type: 'system',
        content: `Removed filter: ${filter}`
      }]);
    } else {
      setActiveFilters(prev => [...prev, filter]);
      setCommandHistory(prev => [...prev, {
        type: 'system',
        content: `Added filter: ${filter}`
      }]);
    }

    // If there was a previous search, re-run it with updated filters
    const lastUserSearch = [...commandHistory]
      .reverse()
      .find(entry =>
        entry.type === 'user' &&
        typeof entry.content === 'string' &&
        (entry.content.toLowerCase().startsWith('search ') ||
          entry.content.toLowerCase().startsWith('find ') ||
          entry.content.toLowerCase().startsWith('cmd '))
      );

      if (lastUserSearch) {
        const content = String(lastUserSearch.content).toLowerCase();
        
        let type: string = '';
        let query: string = '';
      
        if (content.startsWith('search ')) {
          type = 'search';
          query = String(lastUserSearch.content).slice(7).trim();
        } else if (content.startsWith('find ')) {
          type = 'find';
          query = String(lastUserSearch.content).slice(5).trim();
        } else if (content.startsWith('cmd ')) {
          type = 'cmd';
          query = String(lastUserSearch.content).slice(4).trim();
        }
      
        if (query) {
          const updatedFilters = activeFilters.includes(filter)
            ? activeFilters.filter(f => f !== filter)
            : [...activeFilters, filter];
      
          performSearch(query, updatedFilters, type);
        }
      }
  };

  return (
    <div className="bg-black text-green-400 min-h-screen p-2 md:p-6 font-mono flex flex-col max-w-6xl mx-auto">
      <TerminalHeader />

      <TerminalOutput
        commandHistory={commandHistory}
        isTyping={isTyping}
      />

      <CommandInput
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleCommand={handleCommand}
        cursorVisible={cursorVisible}
        isLoading={isLoading}
      />

      <FilterBar
        activeFilters={activeFilters}
        handleFilterClick={handleFilterClick}
      />

      <StatusBar isLoading={isLoading} />

      {/* Settings Component */}
      <Settings
        onSave={saveSettings}
        initialSettings={appSettings}
      />
    </div>
  );
};

export default TerminalFileSearch;