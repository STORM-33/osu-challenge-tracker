import React from 'react';
import { ExternalLink } from 'lucide-react';

// Helper function to count only display text (not markup)
export const countDisplayCharacters = (text) => {
  if (!text) return 0;
  
  // Remove markdown syntax for counting (including escape sequences)
  let displayText = text
    // Remove escape sequences first
    .replace(/\\(.)/g, '$1')  // \* becomes *, \[ becomes [, etc.
    
    // Remove bold/italic markers
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // Bold italic
    .replace(/\*\*(.*?)\*\*/g, '$1')      // Bold
    .replace(/\*(.*?)\*/g, '$1')          // Italic
    .replace(/~~(.*?)~~/g, '$1')          // Strikethrough
    .replace(/`(.*?)`/g, '$1')            // Code
    
    // Remove link syntax, keep only display text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) -> text
    
    // Remove color syntax
    .replace(/\{color:([^}]+)\}(.*?)\{\/color\}/g, '$2')  // {color:red}text{/color} -> text
    
    // Remove highlight syntax
    .replace(/==(.*?)==/g, '$1')          // ==highlight== -> text
    
    // Clean up any remaining whitespace
    .trim();
    
  return displayText.length;
};

// Simple markdown-style parser for partner descriptions
const FormattedDescription = ({ text, className = "" }) => {
  if (!text) return null;

  // Parse the text and convert markdown-style formatting to JSX
  const parseFormatting = (text) => {
    // First, let's preserve line breaks by splitting into lines and processing each line
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      if (!line.trim()) {
        // Empty line
        return <div key={`empty-${lineIndex}`} className="h-2"></div>;
      }
      
      // Process formatting for this line
      const processLine = (lineText) => {
        // First, handle escape sequences - replace \* with a placeholder, process formatting, then restore
        const escapeMap = new Map();
        let escapeCounter = 0;
        
        // Replace escaped characters with placeholders
        const textWithPlaceholders = lineText.replace(/\\(.)/g, (match, char) => {
          const placeholder = `__ESC_${escapeCounter}__`;
          escapeMap.set(placeholder, char);
          escapeCounter++;
          return placeholder;
        });
        
        const patterns = [
          // Bold italic (must come before bold and italic)
          { regex: /\*\*\*(.*?)\*\*\*/g, render: (match, content) => <strong key={Math.random()} className="font-bold italic">{content}</strong> },
          
          // Bold
          { regex: /\*\*(.*?)\*\*/g, render: (match, content) => <strong key={Math.random()} className="font-bold">{content}</strong> },
          
          // Italic
          { regex: /\*(.*?)\*/g, render: (match, content) => <em key={Math.random()} className="italic">{content}</em> },
          
          // Strikethrough
          { regex: /~~(.*?)~~/g, render: (match, content) => <del key={Math.random()} className="line-through opacity-75">{content}</del> },
          
          // Code/monospace
          { regex: /`(.*?)`/g, render: (match, content) => <code key={Math.random()} className="bg-black/10 text-purple-700 px-1 py-0.5 rounded text-sm font-mono">{content}</code> },
          
          // Highlight
          { regex: /==(.*?)==/g, render: (match, content) => <mark key={Math.random()} className="bg-yellow-200 text-yellow-900 px-1 rounded">{content}</mark> },
          
          // Color text - supports CSS color names and hex codes
          { regex: /\{color:([^}]+)\}(.*?)\{\/color\}/g, render: (match, color, content) => 
            <span key={Math.random()} style={{ color: color }} className="font-medium">{content}</span> 
          },
          
          // Links - [text](url)
          { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (match, linkText, url) => (
            <a 
              key={Math.random()}
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 underline decoration-purple-300 hover:decoration-purple-500 transition-all font-medium inline-flex items-center gap-1"
            >
              {linkText}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        ];
        
        let segments = [{ text: textWithPlaceholders, type: 'text' }];
        
        patterns.forEach(pattern => {
          const newSegments = [];
          
          segments.forEach(segment => {
            if (segment.type !== 'text') {
              newSegments.push(segment);
              return;
            }
            
            let lastIndex = 0;
            let match;
            pattern.regex.lastIndex = 0;
            
            while ((match = pattern.regex.exec(segment.text)) !== null) {
              if (match.index > lastIndex) {
                newSegments.push({
                  text: segment.text.slice(lastIndex, match.index),
                  type: 'text'
                });
              }
              
              newSegments.push({
                element: pattern.render(match[0], match[1], match[2]),
                type: 'formatted'
              });
              
              lastIndex = match.index + match[0].length;
            }
            
            if (lastIndex < segment.text.length) {
              newSegments.push({
                text: segment.text.slice(lastIndex),
                type: 'text'
              });
            }
          });
          
          segments = newSegments;
        });
        
        // Restore escaped characters in the final output
        return segments.map((segment, index) => {
          if (segment.type === 'formatted') {
            return React.cloneElement(segment.element, { key: index });
          } else {
            // Restore escaped characters
            let restoredText = segment.text;
            escapeMap.forEach((char, placeholder) => {
              restoredText = restoredText.replace(placeholder, char);
            });
            return restoredText;
          }
        });
      };
      
      return (
        <div key={`line-${lineIndex}`} className="leading-relaxed">
          {processLine(line)}
        </div>
      );
    });
  };

  const displayCharCount = countDisplayCharacters(text);

  return (
    <div className={`formatted-description ${className}`}>
      <div className="w-full text-justify">
        {parseFormatting(text)}
      </div>
    </div>
  );
};

export default FormattedDescription;