import React from 'react';
import QRCode from 'react-qr-code';

export default function ShelfLabel({ article, forPrint = false }) {
  // Generate URL that points to article details
  const articleUrl = `${window.location.origin}?article=${article.id}`;
  
  if (forPrint) {
    // Print version - exact 30x50mm sizing
    return (
      <div className="print-label" style={{
        width: '50mm',
        height: '30mm',
        border: '1px solid #000',
        padding: '2mm',
        display: 'flex',
        fontFamily: 'monospace',
        fontSize: '7pt',
        lineHeight: '1.2',
        pageBreakInside: 'avoid',
        backgroundColor: 'white'
      }}>
        {/* Left side - QR Code */}
        <div style={{ 
          width: '28mm', 
          height: '26mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '1mm'
        }}>
          <QRCode 
            value={articleUrl} 
            size={80}
            level="M"
          />
        </div>
        
        {/* Right side - Text info */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0
        }}>
          {/* Shelf location - large and bold */}
          <div style={{ 
            fontSize: '11pt', 
            fontWeight: 'bold',
            marginBottom: '1mm',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {article.shelf_address || 'Ingen plats'}
          </div>
          
          {/* Article info */}
          <div style={{ fontSize: '6pt', marginBottom: '0.5mm' }}>
            <div style={{ 
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '0.5mm'
            }}>
              {article.name}
            </div>
            <div style={{ 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              #{article.batch_number}
            </div>
            {article.manufacturer && (
              <div style={{ 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontStyle: 'italic'
              }}>
                {article.manufacturer}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Preview version - scaled up for screen viewing
  return (
    <div className="bg-white border-2 border-slate-800 rounded-lg p-4" style={{
      width: '250px',
      height: '150px',
      display: 'flex',
      fontFamily: 'monospace'
    }}>
      {/* Left side - QR Code */}
      <div style={{ 
        width: '140px',
        height: '130px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '8px'
      }}>
        <QRCode 
          value={articleUrl} 
          size={120}
          level="M"
        />
      </div>
      
      {/* Right side - Text info */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minWidth: 0
      }}>
        {/* Shelf location */}
        <div className="text-2xl font-bold mb-2 truncate">
          {article.shelf_address || 'Ingen plats'}
        </div>
        
        {/* Article info */}
        <div className="text-xs space-y-1">
          <div className="font-bold truncate">
            {article.name}
          </div>
          <div className="truncate">
            #{article.batch_number}
          </div>
          {article.manufacturer && (
            <div className="italic truncate text-slate-600">
              {article.manufacturer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}