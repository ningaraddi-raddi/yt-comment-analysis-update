import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, BarChart2, MessageSquare, TrendingUp, PieChart, Filter, Youtube, Star, Heart, ThumbsDown, User } from 'lucide-react';
import axios from 'axios';
import { getVideoId, fetchComments } from './services/youtube';

const BACKEND_URL = 'http://127.0.0.1:5000';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedSentiment, setSelectedSentiment] = useState(null);
  const [charts, setCharts] = useState({
    pie: null,
    wordcloud: null,
    trend: null
  });

  const analyzeVideo = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedSentiment(null);
    setCharts({ pie: null, wordcloud: null, trend: null });

    try {
      const videoId = getVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // 1. Fetch Comments from YouTube
      const comments = await fetchComments(videoId);
      if (comments.length === 0) {
        throw new Error('No comments found or comments are disabled.');
      }

      // 2. Analyze Sentiment (Backend)
      const sentimentResponse = await axios.post(`${BACKEND_URL}/predict_with_timestamps`, {
        comments: comments
      });
      const analyzedComments = sentimentResponse.data;

      // Calculate counts
      const counts = analyzedComments.reduce((acc, curr) => {
        acc[curr.sentiment] = (acc[curr.sentiment] || 0) + 1;
        return acc;
      }, {});

      const sentimentCounts = {
        '1': counts['1'] || 0,
        '0': counts['0'] || 0,
        '-1': counts['-1'] || 0
      };

      // 3. Generate Charts (Parallel)
      const [pieRes, wcRes, trendRes] = await Promise.allSettled([
        axios.post(`${BACKEND_URL}/generate_chart`, { sentiment_counts: sentimentCounts }, { responseType: 'blob' }),
        axios.post(`${BACKEND_URL}/generate_wordcloud`, { comments: comments.map(c => c.text) }, { responseType: 'blob' }),
        axios.post(`${BACKEND_URL}/generate_trend_graph`, { sentiment_data: analyzedComments }, { responseType: 'blob' })
      ]);

      setResults({
        comments: analyzedComments,
        stats: sentimentCounts,
        total: analyzedComments.length
      });

      setCharts({
        pie: pieRes.status === 'fulfilled' ? URL.createObjectURL(pieRes.value.data) : null,
        wordcloud: wcRes.status === 'fulfilled' ? URL.createObjectURL(wcRes.value.data) : null,
        trend: trendRes.status === 'fulfilled' ? URL.createObjectURL(trendRes.value.data) : null
      });

    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const filteredComments = results
    ? (selectedSentiment
      ? results.comments.filter(c => c.sentiment === selectedSentiment)
      : results.comments)
    : [];

  const sentimentConfig = {
    '1': { label: 'Positive', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: Star },
    '0': { label: 'Neutral', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: MessageSquare },
    '-1': { label: 'Negative', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', icon: ThumbsDown }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white font-sans selection:bg-indigo-500 selection:text-white pb-20">

      {/* Navbarish */}
      <nav className="border-b border-white/5 bg-[#0f0f13]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="w-8 h-8 text-red-500" />
            <span className="font-bold text-xl tracking-tight">Sentim<span className="text-indigo-500">Analyzer</span></span>
          </div>
          <div className="text-sm text-gray-500">AI-Powered Insights</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pt-12">

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center transition-all duration-700 ${results ? 'mb-12' : 'mb-32 mt-20'}`}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-6 leading-tight">
            Understand Your Audience <br /> Like Never Before.
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            The one-stop solution for content creators. Paste a video link and instantly get deep emotional insights, key trends, and community feedback analysis.
          </p>
        </motion.div>

        {/* Search Input */}
        <div className="max-w-2xl mx-auto mb-20 relative z-20">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube Video URL here..."
            className="w-full pl-16 pr-32 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-all backdrop-blur-sm shadow-2xl placeholder-gray-500 text-white outline-none"
            onKeyDown={(e) => e.key === 'Enter' && analyzeVideo()}
          />
          <button
            onClick={analyzeVideo}
            disabled={loading || !url}
            className="absolute right-3 top-2.5 bottom-2.5 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Analyze'}
          </button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-2xl mx-auto mb-12 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-center flex items-center justify-center gap-3"
            >
              <Filter className="w-5 h-5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard */}
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            {/* Interactive Stats Filter */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart2 className="text-indigo-500" /> Sentiment Overview
                </h2>
                {selectedSentiment && (
                  <button
                    onClick={() => setSelectedSentiment(null)}
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Positive"
                  id="1"
                  count={results.stats['1']}
                  total={results.total}
                  config={sentimentConfig['1']}
                  selected={selectedSentiment === '1'}
                  onClick={setSelectedSentiment}
                />
                <StatCard
                  title="Neutral"
                  id="0"
                  count={results.stats['0']}
                  total={results.total}
                  config={sentimentConfig['0']}
                  selected={selectedSentiment === '0'}
                  onClick={setSelectedSentiment}
                />
                <StatCard
                  title="Negative"
                  id="-1"
                  count={results.stats['-1']}
                  total={results.total}
                  config={sentimentConfig['-1']}
                  selected={selectedSentiment === '-1'}
                  onClick={setSelectedSentiment}
                />
              </div>
            </div>

            {/* Visualizations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {charts.pie && (
                <ChartCard title="Sentiment Distribution" icon={<PieChart className="w-5 h-5" />}>
                  <img src={charts.pie} alt="Sentiment Pie Chart" className="w-full h-auto rounded-lg" />
                </ChartCard>
              )}
              {charts.wordcloud && (
                <ChartCard title="Common Themes" icon={<MessageSquare className="w-5 h-5" />}>
                  <img src={charts.wordcloud} alt="Word Cloud" className="w-full h-auto rounded-lg" />
                </ChartCard>
              )}
              {charts.trend && (
                <div className="lg:col-span-2">
                  <ChartCard title="Sentiment Over Time" icon={<TrendingUp className="w-5 h-5" />}>
                    <img src={charts.trend} alt="Trend Graph" className="w-full h-auto rounded-lg" />
                  </ChartCard>
                </div>
              )}
            </div>

            {/* Structured Comment List */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <MessageSquare className="text-indigo-400 w-6 h-6" />
                <h3 className="text-2xl font-bold">
                  {selectedSentiment
                    ? `${sentimentConfig[selectedSentiment].label} Comments`
                    : 'All Comments'}
                </h3>
                <span className="text-sm px-3 py-1 bg-white/5 rounded-full text-gray-400">
                  {filteredComments.length} results
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredComments.map((comment, idx) => {
                    const config = sentimentConfig[comment.sentiment];
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={idx}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-5 rounded-2xl border backdrop-blur-sm transition-all hover:shadow-lg ${config.bg} ${config.border} border-opacity-50`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs text-white/50">{new Date(comment.timestamp).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-lg ${config.color} bg-white/5`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed font-medium">
                          {comment.comment}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {filteredComments.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                    No comments found for this filter.
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ title, count, total, config, selected, onClick, id }) => {
  const Icon = config.icon;
  return (
    <button
      onClick={() => onClick(selected ? null : id)}
      className={`relative overflow-hidden group p-6 rounded-3xl border text-left transition-all duration-300 w-full
                ${selected
          ? `bg-white/10 ${config.border} ring-2 ring-offset-2 ring-offset-[#0f0f13] ring-indigo-500`
          : `bg-white/5 border-white/10 hover:bg-white/10 hover:-translate-y-1`
        }
            `}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${config.bg} ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{((count / total) * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-400">{count} comments</div>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-300 group-hover:text-white transition-colors">
        {title}
      </h3>
      <div className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${selected ? 'w-full' : 'w-0 group-hover:w-full'} ${config.color.replace('text-', 'bg-')}`} />
    </button>
  );
};

const ChartCard = ({ title, children, icon }) => (
  <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-xl backdrop-blur-sm">
    <h3 className="text-lg font-semibold mb-6 flex items-center gap-3 text-gray-200">
      <div className="p-2 bg-white/5 rounded-xl text-indigo-400 ring-1 ring-white/10">
        {icon}
      </div>
      {title}
    </h3>
    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 overflow-hidden">
      {children}
    </div>
  </div>
);

export default App;
