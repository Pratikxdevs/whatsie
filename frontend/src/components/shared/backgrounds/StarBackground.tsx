import { useMemo } from 'react';
import './StarBackground.css';

interface StarProps {
    top: string;
    left: string;
    delay: string;
    duration: string;
}

const Star = ({ top, left, delay, duration }: StarProps) => (
    <div
        className="star-bg-shooting-star star-bg-animate"
        style={{
            top,
            left,
            animationDelay: delay,
            animationDuration: duration
        }}
    />
);

const StarBackground = () => {
    // Generate static stars to ensure server/client match (memoized)
    // 100 stars (Increased intensity)
    const stars = useMemo(() => {
        return Array.from({ length: 100 }).map((_, i) => {
            // Randomize position to cover FULL screen (-50% to 150%)
            const top = `${Math.floor(Math.random() * 200) - 50}%`;
            const left = `${Math.floor(Math.random() * 200) - 50}%`;

            // Delays: scatter widely for constant flow
            const delay = `${Math.floor(Math.random() * 10000)}ms`;

            // Duration: 2000ms to 4500ms (Faster: 2s-4.5s range)
            const duration = `${Math.floor(Math.random() * 2500) + 2000}ms`;

            return { id: i, top, left, delay, duration };
        });
    }, []);

    return (
        <div className="star-bg-container">
            <div className="star-bg-night">
                {stars.map((star) => (
                    <Star
                        key={star.id}
                        top={star.top}
                        left={star.left}
                        delay={star.delay}
                        duration={star.duration}
                    />
                ))}
            </div>
        </div>
    );
};

// Memoize to prevent re-renders on parent state changes
import { memo } from 'react';
export default memo(StarBackground);
