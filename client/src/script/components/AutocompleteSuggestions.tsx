import React from 'react';

interface AssetSuggestion {
  name: string;
  code: string;
  _id?: string;
}

interface AutocompleteSuggestionsProps {
  suggestions: AssetSuggestion[];
  onSelect: (suggestion: AssetSuggestion) => void;
  visible: boolean;
  highlightedIndex: number;
}

const AutocompleteSuggestions: React.FC<AutocompleteSuggestionsProps> = ({
  suggestions,
  onSelect,
  visible,
  highlightedIndex
}) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="autocomplete-suggestions">
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.code || index}
          className={`suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
          onClick={() => onSelect(suggestion)}
        >
          <div className="suggestion-name">{suggestion.name}</div>
          <div className="suggestion-code">{suggestion.code}</div>
        </div>
      ))}
    </div>
  );
};

export default AutocompleteSuggestions;