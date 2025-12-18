import axios from 'axios';

const API_KEY = 'AIzaSyBlXFcm3vSs0wR-T7lMhRYMeZBaeVlllUA';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const getVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const fetchComments = async (videoId) => {
    try {
        const response = await axios.get(`${BASE_URL}/commentThreads`, {
            params: {
                part: 'snippet',
                videoId: videoId,
                key: API_KEY,
                maxResults: 100, // Fetch up to 100 comments
                textFormat: 'plainText',
            }
        });

        return response.data.items.map(item => ({
            text: item.snippet.topLevelComment.snippet.textDisplay,
            timestamp: item.snippet.topLevelComment.snippet.publishedAt,
            author: item.snippet.topLevelComment.snippet.authorDisplayName,
            likeCount: item.snippet.topLevelComment.snippet.likeCount
        }));
    } catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
    }
};
