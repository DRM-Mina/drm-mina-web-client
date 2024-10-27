import React from "react";
import { Star } from "lucide-react";

export default function RatingDisplay({ rating }: { rating: number }) {
    return (
        <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const fillPercentage = Math.min(Math.max(rating - (star - 1), 0), 1);

                return (
                    <div key={star} className="relative w-4 h-4">
                        <Star size={16} className="text-gray-300 absolute top-0 left-0" />
                        <div
                            className="overflow-hidden absolute top-0 left-0"
                            style={{ width: `${fillPercentage * 100}%` }}
                        >
                            <Star size={16} className="text-yellow-500" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
