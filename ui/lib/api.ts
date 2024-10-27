const ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export async function fetchGameData() {
    const headers = { "Content-Type": "application/json" };
    const res = await fetch(ENDPOINT + "game-data", { headers, method: "GET" });
    const json = await res.json();
    if (json.errors) {
        console.error(json.errors);
        throw new Error("Failed to fetch API");
    }
    return json;
}

export async function requestNonce(publicKey: string) {
    const res = await fetch(`${ENDPOINT}auth/challenge/${publicKey}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to request nonce");
    }
    const data = await res.json();
    return data.nonce;
}

export async function verifySignature(signature: SignedData) {
    const res = await fetch(`${ENDPOINT}auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: signature }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to verify signature");
    }
    const data = await res.json();
    localStorage.setItem("drmJwtToken", data.token);
    return data.token;
}

export async function authenticateUser(publicKey: string) {
    try {
        const nonce = await requestNonce(publicKey);

        const signature = await window.mina?.signMessage({
            message: nonce,
        });

        if (!signature) {
            throw new Error("Failed to sign nonce");
        }

        const token = await verifySignature(signature);

        console.log("User authenticated successfully");
        return token;
    } catch (error) {
        console.error("Authentication error:", error);
        throw error;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem("drmJwtToken");
    console.log("Token:", token);
    if (!token) {
        throw new Error("User is not authenticated");
    }
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

export async function toggleGameWishlist(publicKey: string, gameId: number): Promise<boolean> {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + "wishlist/", {
        headers,
        method: "POST",
        body: JSON.stringify({ publicKey, gameId }),
    });

    const json = await res.json();
    const status = res.status;

    if (json.errors) {
        console.error(json.errors);
        throw new Error("Failed to add wishlist API");
    }

    if (status == 200) {
        return true;
    } else {
        return false;
    }
}

export async function fetchWishlist(publicKey: string) {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + "wishlist/" + publicKey, {
        headers,
        method: "GET",
    });
    const json = await res.json();
    if (json.errors) {
        console.error(json.errors);
        throw new Error("Failed to fetch wishlist API");
    }
    return json;
}

export async function fetchSlotNames(publicKey: string, gameId: number): Promise<string[]> {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + "slot-names/", {
        headers,
        method: "POST",
        body: JSON.stringify({ publicKey, gameId }),
    });
    const json = await res.json();
    if (json.errors) {
        console.error(json.errors);
        throw new Error("Failed to fetch slot names API");
    }
    return json;
}

export async function postSlotNames(
    publicKey: string,
    gameId: number,
    slotNames: string[]
): Promise<boolean> {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + "slot-names/", {
        headers,
        method: "POST",
        body: JSON.stringify({ publicKey, gameId, slotNames }),
    });

    const json = await res.json();
    const status = res.status;

    if (json.errors) {
        throw new Error("Failed to post slot names API");
    }

    if (status == 200) {
        return true;
    } else {
        return false;
    }
}

export async function postGameData(signedMessage: SignedData) {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + "change-game-data", {
        headers,
        method: "POST",
        body: JSON.stringify({ signature: signedMessage }),
    });

    const json = await res.json();
    const status = res.status;

    if (json.errors) {
        throw new Error("Failed to post game data API");
    }

    if (status == 200) {
        return true;
    } else {
        return false;
    }
}

export async function fetchComments(
    gameId: number,
    page: number = 1,
    limit: number = 10
): Promise<any> {
    const headers = { "Content-Type": "application/json" };
    const res = await fetch(`${ENDPOINT}comments/${gameId}?page=${page}&limit=${limit}`, {
        headers,
        method: "GET",
    });
    if (!res.ok) {
        const errorResponse = await res.json();
        console.error(errorResponse.message);
        throw new Error(`Failed to fetch comments: ${errorResponse.message}`);
    }

    const json = await res.json();
    return json;
}

export async function postComment(
    gameId: number,
    content: string,
    rating: number
): Promise<boolean> {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + "comments", {
        headers,
        method: "POST",
        body: JSON.stringify({ content, rating, gameId }),
    });

    if (!res.ok) {
        const errorResponse = await res.json();
        console.error(errorResponse.message);
        throw new Error(`Failed to post comment: ${errorResponse.message}`);
    }

    return true;
}

export async function editComment(
    commentId: string,
    content: string,
    rating: number
): Promise<boolean> {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + `comments/${commentId}`, {
        headers,
        method: "PUT",
        body: JSON.stringify({ content, rating }),
    });

    if (!res.ok) {
        const errorResponse = await res.json();
        console.error(errorResponse.message);
        throw new Error(`Failed to edit comment: ${errorResponse.message}`);
    }

    return true;
}

export async function deleteComment(commentId: string): Promise<boolean> {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + `comments/${commentId}`, {
        headers,
        method: "DELETE",
    });

    if (!res.ok) {
        const errorResponse = await res.json();
        console.error(errorResponse.message);
        throw new Error(`Failed to delete comment: ${errorResponse.message}`);
    }

    return true;
}

export async function fetchGameRating(gameId: number): Promise<number> {
    const headers = { "Content-Type": "application/json" };
    const res = await fetch(`${ENDPOINT}rating/${gameId}`, {
        headers,
        method: "GET",
    });
    if (!res.ok) {
        const errorResponse = await res.json();
        console.error(errorResponse.message);
        throw new Error(`Failed to fetch game rating: ${errorResponse.message}`);
    }

    const json = await res.json();
    return json.rating;
}
