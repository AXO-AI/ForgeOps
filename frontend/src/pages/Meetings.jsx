import { useState } from 'react';
import { analyzeTranscript } from '../api';

export default function Meetings() {
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await analyzeTranscript({ transcript });
      setAnalysis(result);
    } catch (e) {
      setError('Failed to analyze transcript. Check that the AI service is configured.');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Meetings</h1>
        <p>AI-powered meeting transcript analysis</p>
      </div>

      <div className="card mb-4">
        <div className="card-header">Paste Transcript</div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste your meeting transcript here..."
          style={{ minHeight: 200 }}
        />
        <button
          className="btn btn-primary mt-2"
          onClick={handleAnalyze}
          disabled={loading || !transcript.trim()}
        >
          {loading ? 'Analyzing...' : 'Analyze Transcript'}
        </button>
        {error && <p style={{ color: 'var(--err)', marginTop: 8, fontSize: 13 }}>{error}</p>}
      </div>

      {analysis && (
        <div className="card">
          <div className="card-header">Analysis Results</div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7 }}>
            {typeof analysis === 'string' ? analysis : (
              <>
                {analysis.summary && (
                  <div className="mb-4">
                    <strong>Summary</strong>
                    <p className="text-dim mt-2">{analysis.summary}</p>
                  </div>
                )}
                {analysis.actionItems && analysis.actionItems.length > 0 && (
                  <div className="mb-4">
                    <strong>Action Items</strong>
                    <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                      {analysis.actionItems.map((item, i) => (
                        <li key={i} className="text-dim" style={{ marginBottom: 4 }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.decisions && analysis.decisions.length > 0 && (
                  <div className="mb-4">
                    <strong>Decisions</strong>
                    <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                      {analysis.decisions.map((d, i) => (
                        <li key={i} className="text-dim" style={{ marginBottom: 4 }}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Fallback for other shapes */}
                {!analysis.summary && !analysis.actionItems && (
                  <pre>{JSON.stringify(analysis, null, 2)}</pre>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
