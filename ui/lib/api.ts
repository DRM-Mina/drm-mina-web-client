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
    localStorage.setItem("drmjwtToken", data.token);
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
    const token = localStorage.getItem("jwtToken");
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

    const res = await fetch(ENDPOINT + "wishlist/" + publicKey, {
        headers,
        method: "POST",
        body: JSON.stringify({ gameId }),
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

    const res = await fetch(ENDPOINT + "slot-names/" + publicKey, {
        headers,
        method: "POST",
        body: JSON.stringify({ gameId }),
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
    slots: string[]
): Promise<boolean> {
    const headers = getAuthHeaders();

    const res = await fetch(ENDPOINT + "slot-names/" + publicKey, {
        headers,
        method: "POST",
        body: JSON.stringify({ gameId: gameId, slotNames: slots }),
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
