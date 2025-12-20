import axios from 'axios';


const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const getVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const fetchComments = async (videoId) => {
    try {
        let comments = [];
        let nextPageToken = null;

        do {
            const response = await axios.get(`${BASE_URL}/commentThreads`, {
                params: {
                    part: 'snippet',
                    videoId: videoId,
                    key: API_KEY,
                    maxResults: 100,
                    textFormat: 'plainText',
                    pageToken: nextPageToken
                }
            });

            const newComments = response.data.items.map(item => ({
                text: item.snippet.topLevelComment.snippet.textDisplay,
                timestamp: item.snippet.topLevelComment.snippet.publishedAt,
                author: item.snippet.topLevelComment.snippet.authorDisplayName,
                likeCount: item.snippet.topLevelComment.snippet.likeCount
            }));

            comments = [...comments, ...newComments];
            nextPageToken = response.data.nextPageToken;

        } while (nextPageToken);

        return comments;
    } catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
    }
};
