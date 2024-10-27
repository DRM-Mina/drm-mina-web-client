"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { deleteComment, fetchComments, postComment } from "@/lib/api";
import { Star } from "lucide-react";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useToast } from "@/components/ui/use-toast";
import RatingInput from "./ratingInput";
import RatingDisplay from "./ratingDisplay";
import { useGamesStore } from "@/lib/stores/gameStore";
import Jazzicon from "react-jazzicon";
import { base58Decode } from "@/lib/utils";

interface CommentSectionProps {
    game: Game;
}

export default function CommentSection({ game }: CommentSectionProps) {
    const [comments, setComments] = useState<IComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [rating, setRating] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [currentLimit, setCurrentLimit] = useState(10);
    const [totalComments, setTotalComments] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [postTrigger, setPostTrigger] = useState(false);
    const walletStore = useWalletStore();
    const gameStore = useGamesStore();
    const { toast } = useToast();

    useEffect(() => {
        const loadComments = async () => {
            setIsLoading(true);
            try {
                const { comments, totalComments, totalPages } = await fetchComments(
                    game.gameId,
                    currentPage,
                    currentLimit
                );
                console.log(comments, totalComments, totalPages);

                setComments(comments);
                setTotalPages(totalPages);
                setTotalComments(totalComments);
            } catch (error) {
                console.error("Failed to fetch comments:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadComments();
    }, [game.gameId, currentPage, postTrigger]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            console.log("Posting comment", game.gameId, newComment, rating);
            const res = await postComment(game.gameId, newComment, rating);
            if (res) {
                toast({
                    title: "Comment posted successfully!",
                });
                setNewComment("");
                setRating(1);
                setCurrentPage(1);
                setPostTrigger((prev) => !prev);
                gameStore.setTrigger();
            }
        } catch (error) {
            toast({
                title: "Failed to post comment",
            });
        }
    };

    const handleEditComment = (commentId: string) => {
        console.log("Edit comment", commentId);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!commentId) {
            return;
        }
        try {
            console.log("Delete comment", commentId);
            const res = await deleteComment(commentId);
            if (res) {
                toast({
                    title: "Comment deleted successfully!",
                });
                setPostTrigger((prev) => !prev);
                gameStore.setTrigger();
            }
        } catch (error) {
            toast({
                title: "Failed to delete comment",
            });
        }
    };

    const handleLoadMore = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prevPage) => prevPage + 1);
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Comments ( {totalComments} )</h2>
            {walletStore.isAuthenticated ? (
                <div className="mb-6 max-w-96">
                    <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <div className="mt-2 flex items-center">
                        <span className="mr-2">Your Rating:</span>
                        <RatingInput rating={rating} setRating={setRating} />
                    </div>
                    <Button
                        className="mt-2"
                        onClick={handleAddComment}
                        disabled={isLoading || !newComment.trim()}
                    >
                        Post Comment
                    </Button>
                </div>
            ) : (
                <p>Please connect your wallet to post a comment.</p>
            )}
            <Separator />
            <div className="mt-6 space-y-6">
                {comments.length > 0 ? (
                    comments.map((comment) => (
                        <div key={comment._id} className="flex space-x-4">
                            <Avatar>
                                <Jazzicon
                                    diameter={40}
                                    seed={base58Decode(comment.user.publicKey)}
                                />
                            </Avatar>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium">
                                        {comment.user.publicKey.slice(0, 4) +
                                            " ... " +
                                            comment.user.publicKey.slice(-4)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {new Date(comment.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <RatingDisplay rating={comment.rating} />
                                </div>
                                <p>{comment.content}</p>
                                {walletStore.isAuthenticated &&
                                    walletStore.userPublicKey === comment.user.publicKey && (
                                        <div className="flex space-x-2 mt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditComment(comment._id)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteComment(comment._id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No comments yet. Be the first to comment!</p>
                )}
                {isLoading && <p>Loading comments...</p>}
            </div>
            {currentPage < totalPages && (
                <Button onClick={handleLoadMore} className="mt-4" disabled={isLoading}>
                    {isLoading ? "Loading..." : "Load More Comments"}
                </Button>
            )}
        </div>
    );
}
