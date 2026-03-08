import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Upload, FileSpreadsheet, FileText, Download,
  Loader2, X, AlertCircle, LayoutDashboard,
  BrainCircuit, Database, CheckCircle2, Play, BookOpen,
  FlaskConical, Trophy, Clock, RefreshCw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [activeView, setActiveView] = useState('import');
  const [error, setError] = useState(null);

  // -- Import View State --
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [csvFilename, setCsvFilename] = useState('');
  const [dragging, setDragging] = useState(false);
  const [autoRetrain, setAutoRetrain] = useState(true);
  const fileInputRef = useRef(null);

  // -- MLflow State --
  const [mlflowData, setMlflowData] = useState(null);
  const [mlflowLoading, setMlflowLoading] = useState(false);
  const [mlflowError, setMlflowError] = useState(null);

  // -- Metrics History (for simple accuracy chart) --
  const [accuracyHistory, setAccuracyHistory] = useState([]);

  // -- Train View State --
  const [pipelineState, setPipelineState] = useState({
    split: { status: 'idle', data: null },
    ingest: { status: 'idle', data: null },
    clean: { status: 'idle', data: null },
    train: { status: 'idle', data: null },
    evaluate: { status: 'idle', data: null },
    predict: { status: 'idle', data: null },
    drift: { status: 'idle', data: null }
  });

  // -- Import Handlers --
  const handleFileChange = (e) => validateAndSetFile(e.target.files[0]);
  const validateAndSetFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setError('Envie um arquivo Excel válido (.xlsx ou .xls)');
      return;
    }
    setFile(f); setError(null); setDownloadUrl(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const resp = await axios.post(`${API_BASE_URL}/convert`, file, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': file.name
        }
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const cd = resp.headers['content-disposition'];
      let fn = 'converted.zip';
      if (cd && cd.includes('filename=')) {
        fn = cd.split('filename=')[1].replace(/["']/g, '');
      }
      setDownloadUrl(url); setCsvFilename(fn);
    } catch (err) {
      setError('Falha ao converter o arquivo. Verifique se o backend está em execução corretamente.');
    } finally { setLoading(false); }
  };

  // -- Pipeline Handlers --
  const runStep = async (step, endpoint) => {
    setPipelineState(prev => ({ ...prev, [step]: { ...prev[step], status: 'loading' } }));
    try {
      let url = `${API_BASE_URL}/${endpoint}`;
      if (step === 'drift') {
        url += `?auto_retrain=${autoRetrain}`;
      }
      const resp = await axios.post(url);
      setPipelineState(prev => ({ ...prev, [step]: { status: 'success', data: resp.data } }));

      if (step === 'predict' && resp.data?.accuracy != null) {
        setAccuracyHistory(prev => [
          ...prev,
          { run: prev.length + 1, accuracy: resp.data.accuracy }
        ]);
      }
    } catch (err) {
      setPipelineState(prev => ({ ...prev, [step]: { status: 'error', data: err.response?.data?.detail || err.message } }));
    }
  };

  // -- MLflow Handler --
  const fetchMlflowRuns = async () => {
    setMlflowLoading(true);
    setMlflowError(null);
    try {
      const resp = await axios.get(`${API_BASE_URL}/mlflow-runs`);
      setMlflowData(resp.data);
    } catch (err) {
      setMlflowError(err.response?.data?.detail || err.message);
    } finally {
      setMlflowLoading(false);
    }
  };

  const steps = [
    { id: 'split', label: '1. Preparar Split', endpoint: 'prepare-dataset', desc: 'Une as abas do Excel e divide em conjuntos de treino e teste (80/20).' },
    { id: 'ingest', label: '2. Ingestão de Dados', endpoint: 'ingest', desc: 'Carrega os dados de treino para memória e prepara para limpeza.' },
    { id: 'clean', label: '3. Limpeza de Dados', endpoint: 'clean', desc: 'Remove duplicidades e trata valores ausentes.' },
    { id: 'train', label: '4. Treinamento do Modelo', endpoint: 'train', desc: 'Treina Logistic Regression, Random Forest e XGBoost (Optuna). Salva o campeão.' },
    { id: 'evaluate', label: '5. Avaliação (Test Set)', endpoint: 'evaluate', desc: 'Métricas no conjunto de teste hold-out (20% separado no split). Evita data leakage.' },
    { id: 'predict', label: '6. Avaliação (Dataset Completo)', endpoint: 'evaluate-full', desc: 'Mede Acurácia, Precision, Recall e F1-Score no conjunto completo (2022 + 2023 + 2024).' },
    { id: 'drift', label: '7. Detecção de Drift', endpoint: 'drift', desc: 'Analisa mudanças na distribuição dos dados com Evidently.' }
  ];

  // Helper: format duration
  const fmtDuration = (ms) => {
    if (!ms || ms <= 0) return '< 1s';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  // Helper: medal color for leaderboard position
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <>
      <nav className="sidebar">
        <div className="logo"><LayoutDashboard size={28} color="#fe0058" /><span>Datathon</span></div>
        <div className="nav-menu">
          <div className={`nav-item ${activeView === 'import' ? 'active' : ''}`} onClick={() => setActiveView('import')}>
            <Database size={20} /><span>Importar Excel</span>
          </div>
          <div className={`nav-item ${activeView === 'train' ? 'active' : ''}`} onClick={() => setActiveView('train')}>
            <BrainCircuit size={20} /><span>Pipeline de ML</span>
          </div>
          <div className={`nav-item ${activeView === 'mlflow' ? 'active' : ''}`} onClick={() => { setActiveView('mlflow'); fetchMlflowRuns(); }}>
            <FlaskConical size={20} /><span>Experimentos</span>
          </div>
          <div className={`nav-item ${activeView === 'docs' ? 'active' : ''}`} onClick={() => setActiveView('docs')}>
            <BookOpen size={20} /><span>Docs / API</span>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {/* ---- Import View ---- */}
        {activeView === 'import' && (
          <div className="view-container">
            <h1>Importar Dados</h1>
            <p className="subtitle">Envie arquivos Excel para alimentar o pipeline de IA.</p>
            <div className="card">
              <div
                className={`upload-area ${dragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); validateAndSetFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'rgba(254,0,88,0.1)', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                  <Upload size={32} />
                </div>
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                    <FileSpreadsheet size={24} color="#fe0058" />
                    <strong>{file.name}</strong>
                    <X size={20} onClick={(e) => { e.stopPropagation(); setFile(null); }} />
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 600 }}>Arraste o Excel aqui</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Suporta .xlsx, .xls</p>
                  </div>
                )}
              </div>
              <button className="convert-button" onClick={handleConvert} disabled={!file || loading}>
                {loading ? <Loader2 className="loading-spinner" /> : <><FileText size={20} /> Iniciar Conversão</>}
              </button>
              {error && (
                <div style={{ marginTop: '1rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              {downloadUrl && (
                <div className="success-area">
                  <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '1rem' }}>Conversão concluída!</p>
                  <a href={downloadUrl} download={csvFilename} className="download-link">
                    <Download size={20} /> Baixar Resultados
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Train / ML Pipeline View ---- */}
        {activeView === 'train' && (
          <div className="view-container">
            <h1>Pipeline de Desenvolvimento de ML</h1>
            <p className="subtitle">
              Este pipeline prevê o <strong>risco de defasagem escolar</strong> de estudantes
              da Associação Passos Mágicos com base nos dados de 2022–2024, passando por
              todas as etapas de um ciclo de vida de Machine Learning.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {steps.map((step) => (
                <div key={step.id} className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{step.label}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{step.desc}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      {step.id === 'drift' && (
                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <input type="checkbox" checked={autoRetrain} onChange={(e) => setAutoRetrain(e.target.checked)} />
                          Re-treinar em caso de drift
                        </label>
                      )}
                      <button
                        className="convert-button"
                        onClick={() => runStep(step.id, step.endpoint)}
                        disabled={pipelineState[step.id].status === 'loading'}
                        style={{
                          width: 'auto', padding: '0.6rem 1.2rem',
                          background: pipelineState[step.id].status === 'success'
                            ? 'var(--success)'
                            : pipelineState[step.id].status === 'error'
                              ? 'var(--error)'
                              : 'var(--primary)'
                        }}
                      >
                        {pipelineState[step.id].status === 'loading' ? <Loader2 className="loading-spinner" size={18} />
                          : pipelineState[step.id].status === 'success' ? <CheckCircle2 size={18} />
                            : <Play size={18} />}
                        {pipelineState[step.id].status === 'success' ? 'Concluído'
                          : pipelineState[step.id].status === 'loading' ? 'Executando...'
                            : 'Executar Etapa'}
                      </button>
                    </div>
                  </div>

                  {pipelineState[step.id].status === 'success' && pipelineState[step.id].data && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.85rem' }}>
                      {step.id === 'evaluate' && pipelineState.evaluate.data?.accuracy ? (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            {[
                              { label: 'Acurácia', value: pipelineState.evaluate.data.accuracy, color: 'var(--primary)' },
                              { label: 'Precision', value: pipelineState.evaluate.data.metrics?.['macro avg']?.precision, color: '#22c55e' },
                              { label: 'Recall', value: pipelineState.evaluate.data.metrics?.['macro avg']?.recall, color: '#f59e0b' },
                              { label: 'F1-Score', value: pipelineState.evaluate.data.metrics?.['macro avg']?.['f1-score'], color: '#38bdf8' },
                            ].map(m => (
                              <div key={m.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', textAlign: 'center', border: `1px solid ${m.color}30` }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{m.label}</p>
                                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: m.color }}>{m.value != null ? `${(m.value * 100).toFixed(2)}%` : '—'}</p>
                              </div>
                            ))}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Dataset: <strong style={{ color: 'var(--text-main)' }}>test.csv (hold-out 20%)</strong> • Alvo: <strong style={{ color: 'var(--primary)' }}>{pipelineState.evaluate.data.target}</strong></p>
                          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff6b9d', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.4 }}>{pipelineState.evaluate.data.classification_report}</pre>
                        </div>
                      ) : step.id === 'predict' && pipelineState.predict.data?.accuracy ? (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                            {[
                              { label: 'Acurácia', value: pipelineState.predict.data.accuracy, color: 'var(--primary)' },
                              { label: 'Precision', value: pipelineState.predict.data.precision_macro, color: '#22c55e' },
                              { label: 'Recall', value: pipelineState.predict.data.recall_macro, color: '#f59e0b' },
                              { label: 'F1-Score', value: pipelineState.predict.data.f1_macro, color: '#38bdf8' },
                            ].map(m => (
                              <div key={m.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', textAlign: 'center', border: `1px solid ${m.color}30` }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{m.label}</p>
                                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: m.color }}>{m.value != null ? `${(m.value * 100).toFixed(2)}%` : '—'}</p>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>📂 Dataset: <strong style={{ color: 'var(--text-main)' }}>{pipelineState.predict.data.dataset}</strong></span>
                            <span>📊 Amostras: <strong style={{ color: 'var(--text-main)' }}>{pipelineState.predict.data.n_samples?.toLocaleString()}</strong></span>
                            <span>🎯 Coluna Alvo: <strong style={{ color: 'var(--primary)' }}>{pipelineState.predict.data.target}</strong></span>
                          </div>
                          <p style={{ color: 'var(--text-muted)', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Relatório Detalhado por Classe:</p>
                          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff6b9d', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.4 }}>{pipelineState.predict.data.classification_report}</pre>
                        </div>
                      ) : step.id === 'drift' ? (
                        <div style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: pipelineState.drift.data.dataset_drift ? 'var(--error)' : 'var(--success)' }}></div>
                            <span style={{ fontWeight: 600 }}>{pipelineState.drift.data.dataset_drift ? '🚨 Drift detectado' : '✅ Dados estáveis'}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Método: {pipelineState.drift.data.method}</span>
                          </div>
                          <p>Proporção de Drift: {(pipelineState.drift.data.drift_share * 100).toFixed(1)}%</p>
                          {pipelineState.drift.data.ct_status && (
                            <div style={{ marginTop: '0.8rem', padding: '0.5rem', borderLeft: '3px solid var(--primary)', background: 'rgba(254,0,88,0.05)' }}>
                              <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem' }}>🔄 Ação de Treinamento Contínuo:</p>
                              <p>{pipelineState.drift.data.ct_status}</p>
                              {pipelineState.drift.data.new_accuracy && (
                                <p>Nova Acurácia: <strong>{(pipelineState.drift.data.new_accuracy * 100).toFixed(2)}%</strong></p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre style={{ whiteSpace: 'pre-wrap', color: '#ff6b9d' }}>{JSON.stringify(pipelineState[step.id].data, null, 2)}</pre>
                      )}
                    </div>
                  )}

                  {pipelineState[step.id].status === 'error' && (
                    <div style={{ marginTop: '1rem', color: 'var(--error)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} /> {pipelineState[step.id].data}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {accuracyHistory.length > 0 && (
              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>Evolução da Acurácia por Execução</h3>
                <div className="accuracy-chart">
                  {accuracyHistory.map(run => (
                    <div key={run.run} className="accuracy-bar-wrapper">
                      <div className="accuracy-bar" style={{ height: `${run.accuracy * 100}%` }} />
                      <span className="accuracy-label">Run {run.run}</span>
                      <span className="accuracy-value">{(run.accuracy * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- MLflow Experiments View ---- */}
        {activeView === 'mlflow' && (
          <div className="view-container" style={{ maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h1 style={{ marginBottom: 0 }}>Experimentos MLflow</h1>
              <button
                className="convert-button"
                onClick={fetchMlflowRuns}
                disabled={mlflowLoading}
                style={{ width: 'auto', padding: '0.6rem 1.2rem' }}
              >
                {mlflowLoading ? <Loader2 className="loading-spinner" size={16} /> : <RefreshCw size={16} />}
                Atualizar
              </button>
            </div>
            <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
              Resultados de todos os experimentos registrados no MLflow. Treine o modelo para ver o leaderboard.
            </p>

            {mlflowError && (
              <div className="card" style={{ color: 'var(--error)', display: 'flex', gap: '0.5rem' }}>
                <AlertCircle size={16} /> {mlflowError}
              </div>
            )}

            {mlflowLoading && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Loader2 className="loading-spinner" size={32} style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '1rem' }}>Carregando experimentos...</p>
              </div>
            )}

            {mlflowData && !mlflowLoading && (
              <>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Total de Runs', value: mlflowData.total_runs, icon: <FlaskConical size={20} /> },
                    { label: 'Experimento', value: mlflowData.experiment_name || 'N/A', icon: <BrainCircuit size={20} /> },
                    {
                      label: 'Melhor Acurácia',
                      value: mlflowData.runs.find(r => r.metrics?.accuracy != null)
                        ? `${(mlflowData.runs.find(r => r.metrics?.accuracy != null).metrics.accuracy * 100).toFixed(2)}%`
                        : 'N/A',
                      icon: <Trophy size={20} />
                    }
                  ].map((stat, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ color: 'var(--primary)', opacity: 0.8 }}>{stat.icon}</div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Leaderboard table */}
                {mlflowData.runs.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FlaskConical size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                    <p>Nenhum experimento encontrado. Execute o Passo 4 (Treinamento).</p>
                  </div>
                ) : (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(254,0,88,0.08)', borderBottom: '1px solid var(--glass-border)' }}>
                          {['#', 'Modelo / Run', 'Acurácia', 'Parâmetros', 'Duração', 'Status'].map(h => (
                            <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mlflowData.runs.map((run, idx) => (
                          <tr key={run.run_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(254,0,88,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '1rem', color: idx < 3 ? medalColors[idx] : 'var(--text-muted)' }}>
                              {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <p style={{ fontWeight: 600 }}>{run.run_name || `run-${run.run_id.slice(0, 8)}`}</p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{run.run_id.slice(0, 12)}...</p>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              {run.metrics?.accuracy != null ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>
                                    {(run.metrics.accuracy * 100).toFixed(2)}%
                                  </span>
                                  <div style={{ marginTop: '4px', height: '4px', width: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${run.metrics.accuracy * 100}%`, background: 'var(--primary)', borderRadius: '999px' }} />
                                  </div>
                                </div>
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {Object.keys(run.params).length > 0
                                ? Object.entries(run.params).slice(0, 2).map(([k, v]) => (
                                  <div key={k}><strong>{k}:</strong> {v}</div>
                                ))
                                : '—'}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Clock size={12} />
                                {fmtDuration(run.duration_ms)}
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600,
                                background: run.status === 'FINISHED' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: run.status === 'FINISHED' ? 'var(--success)' : 'var(--error)'
                              }}>
                                {run.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ---- Docs View ---- */}
        {activeView === 'docs' && (
          <div className="view-container">
            <h1>API &amp; Documentação</h1>
            <p className="subtitle">
              Guia rápido para testar a API de risco de defasagem escolar e integrar este backend a outros sistemas.
            </p>

            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Health Check</h3>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>curl -X GET {API_BASE_URL}/health</pre>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Previsão Individual (POST /predict)</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Recebe um JSON com as features de um estudante e retorna a previsão (classe e probabilidades).
              </p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {`curl -X POST ${API_BASE_URL}/predict \\
  -H "Content-Type: application/json" \\
  -d '{"Fase": 3, "Gênero": "F", "INDE 2024": 7.5}'`}
              </pre>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                {`{
  "predicted_class": 1,
  "probabilities": {"0": 0.23, "1": 0.77},
  "target_column": "Fase"
}`}
              </pre>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Avaliação do Modelo (POST /evaluate)</h3>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>curl -X POST {API_BASE_URL}/evaluate</pre>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Leaderboard MLflow (GET /mlflow-runs)</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Retorna todos os runs do experimento com métricas, parâmetros e status, ordenados por acurácia.
              </p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>curl -X GET {API_BASE_URL}/mlflow-runs</pre>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Detecção de Drift com Auto-Retrain</h3>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                curl -X POST "{API_BASE_URL}/drift?auto_retrain=true"
              </pre>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
