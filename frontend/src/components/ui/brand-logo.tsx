import React, { useState, useEffect } from 'react';
import { getProviderLogoUrls, getBrandColor } from '../../lib/brand-resolver';

interface BrandLogoProps {
  providerSlug: string;
  className?: string;
  sizeClassName?: string; // e.g. "w-6 h-6 text-xs"
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  providerSlug,
  className = "",
  sizeClassName = "w-6 h-6 text-xs"
}) => {
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const urls = getProviderLogoUrls(providerSlug);

  // Reset fallback index if provider slug changes
  useEffect(() => {
    setFallbackIndex(0);
  }, [providerSlug]);

  const hasFailedAll = fallbackIndex >= urls.length;

  if (hasFailedAll) {
    const initial = (providerSlug || '?').charAt(0).toUpperCase();
    const bgColor = getBrandColor(providerSlug);
    return (
      <div
        className={`flex items-center justify-center rounded-full text-white font-semibold select-none shadow-sm ${sizeClassName} ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={urls[fallbackIndex]}
      alt={`${providerSlug} logo`}
      className={`rounded-full object-contain bg-white border border-border p-[1px] ${sizeClassName} ${className}`}
      onError={() => {
        setFallbackIndex(prev => prev + 1);
      }}
    />
  );
};
