import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Home from './Home';
import { importKey, decryptData } from '../lib/crypto';
import { GistData } from '../lib/gist-utils';
import { config } from '../config';

const Gist = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [gist, setGist] = useState<GistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGist = async () => {
            try {
                if (!id) throw new Error("No Gist ID provided");

                // Get key from hash (remove #)
                const keyHex = location.hash.substring(1);
                if (!keyHex) throw new Error("Decryption key missing from URL");

                // Fetch metadata and download URL
                const response = await fetch(`${config.API_URL}/api/gists/${id}`);
                if (!response.ok) {
                    if (response.status === 404) throw new Error("Gist not found");
                    if (response.status === 410) throw new Error("Gist expired or read limit reached");
                    throw new Error("Failed to fetch gist metadata");
                }

                const data = await response.json();
                const { download_url, gist_metadata } = data;

                if (!download_url || !gist_metadata?.iv) {
                    throw new Error("Invalid gist data format");
                }

                // Fetch encrypted content from S3
                const contentResponse = await fetch(download_url);
                if (!contentResponse.ok) throw new Error("Failed to download content");
                
                const encrypted_content = await contentResponse.text();

                // Decrypt
                const key = await importKey(keyHex);
                const decryptedJson = await decryptData(encrypted_content, gist_metadata.iv, key);
                const gistData = JSON.parse(decryptedJson) as GistData;

                setGist(gistData);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchGist();
    }, [id, location.hash]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-500 dark:text-gray-400">Decrypting secure content...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700 dark:text-gray-300">{error}</p>
                    <a href="/" className="inline-block mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    return gist ? <Home initialGist={gist} readOnly /> : null;
};

export default Gist;