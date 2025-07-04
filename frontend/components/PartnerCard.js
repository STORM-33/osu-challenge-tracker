import { ExternalLink, Users } from 'lucide-react';

export default function PartnerCard({ partner, size = 'medium' }) {
  const sizeConfig = {
    small: {
      iconSize: 'w-16 h-16',
      textSize: 'text-sm',
      padding: 'p-3',
      gap: 'gap-2'
    },
    medium: {
      iconSize: 'w-20 h-20',
      textSize: 'text-base',
      padding: 'p-4',
      gap: 'gap-3'
    },
    large: {
      iconSize: 'w-24 h-24',
      textSize: 'text-lg',
      padding: 'p-6',
      gap: 'gap-4'
    }
  };

  const config = sizeConfig[size];

  return (
    <a
      href={partner.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl glass-card-enhanced">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-purple-100 opacity-50" />
        
        {/* Content */}
        <div className={`relative z-10 ${config.padding} flex flex-col items-center ${config.gap}`}>
          {/* Discord-style icon container */}
          <div className={`${config.iconSize} rounded-2xl overflow-hidden bg-white shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:scale-110 group-hover:rounded-xl`}>
            <img
              src={partner.icon_url}
              alt={partner.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name)}&background=9333ea&color=fff&size=256`;
              }}
            />
          </div>
          
          {/* Partner name */}
          <div className="text-center">
            <h3 className={`${config.textSize} font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors duration-300`}>
              {partner.name}
            </h3>
            
            {/* Description (if available and not small size) */}
            {partner.description && size !== 'small' && (
              <p className="text-xs text-neutral-600 mt-1 line-clamp-2 max-w-[150px]">
                {partner.description}
              </p>
            )}
          </div>
          
          {/* External link indicator */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ExternalLink className="w-4 h-4 text-primary-500" />
          </div>
        </div>
      </div>
    </a>
  );
}