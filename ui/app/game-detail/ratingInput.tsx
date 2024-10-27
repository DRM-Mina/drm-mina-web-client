import React, { useState } from "react";
import { Star } from "lucide-react";

interface RatingInputProps {
    rating: number;
    setRating: (rating: number) => void;
}

export default function RatingInput({ rating, setRating }: RatingInputProps) {
    const [hoverRating, setHoverRating] = useState(0);

    const handleClick = (rate: number) => {
        setRating(rate);
    };

    const handleMouseEnter = (rate: number) => {
        setHoverRating(rate);
    };

    const handleMouseLeave = () => {
        setHoverRating(0);
    };

    return (
        <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((rate) => (
                <Star
                    key={rate}
                    size={24}
                    className={`cursor-pointer ${
                        (hoverRating || rating) >= rate ? "text-yellow-500" : "text-gray-300"
                    }`}
                    onClick={() => handleClick(rate)}
                    onMouseEnter={() => handleMouseEnter(rate)}
                    onMouseLeave={handleMouseLeave}
                />
            ))}
        </div>
    );
}
