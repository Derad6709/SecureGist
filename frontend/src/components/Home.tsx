import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
    Plus, Trash2, FileCode, Share2, Edit2, Code2, Upload, X, Lock,
    Link as LinkIcon, ChevronDown, ChevronUp, Info, Settings,
    Shield, Globe, Eye, Calendar
} from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import Editor from 'react-simple-code-editor';
import { QRCodeSVG } from 'qrcode.react';
import DOMPurify from 'dompurify';
import { compressGist, decompressGist, GistData, GistFile } from '../lib/gist-utils';
import { generateKey, exportKey, encryptData } from '../lib/crypto';
import { config } from '../config';

// Configure marked for GFM
marked.use({
    gfm: true,
    breaks: true,
});

const DEFAULT_FILE: GistFile = {
    name: 'filename.txt',
    content: '',
    type: 'text'
};

interface HomeProps {
    initialGist?: GistData;
    readOnly?: boolean;
}

const Home = ({ initialGist, readOnly = false }: HomeProps) => {
    const [gist, setGist] = useState<GistData>(initialGist || {
        files: [{ ...DEFAULT_FILE }],
        description: ''
    });
    const [loading, setLoading] = useState(!initialGist);
    const [mode, setMode] = useState<'edit' | 'view'>(initialGist ? 'view' : 'edit');
    const [showQR, setShowQR] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Accordion state: track which files are expanded. Default all true.
    const [expandedFiles, setExpandedFiles] = useState<boolean[]>([true]);

    // Encryption settings
    const [maxReads, setMaxReads] = useState<number>(100);
    const [expiration, setExpiration] = useState<string>('7d'); // 1d, 7d, 30d, 90d

    const location = useLocation();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Handle click outside for settings popover
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        };

        if (showSettings) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSettings]);

    // Initialize expanded state when files change length (roughly)
    useEffect(() => {
        if (gist.files.length > expandedFiles.length) {
            setExpandedFiles(prev => [...prev, true]);
        }
    }, [gist.files.length]);

    useEffect(() => {
        if (initialGist) {
            setLoading(false);
            setExpandedFiles(new Array(initialGist.files.length).fill(true));
            return;
        }

        const hash = location.hash;
        if (hash && hash.length > 1) {
            const data = decompressGist(hash);
            if (data) {
                setGist(data);
                setMode('view');
                setExpandedFiles(new Array(data.files.length).fill(true));
            } else {
                console.error("Invalid Gist Hash");
            }
        } else {
            setMode('edit');
        }
        setLoading(false);
    }, [location.hash, initialGist]);

    useEffect(() => {
        if (mode === 'view') {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block as HTMLElement);
            });
        }
    }, [mode, gist, expandedFiles]);

    const handleFileChange = (index: number, field: keyof GistFile, value: string) => {
        const newFiles = [...gist.files];
        newFiles[index] = { ...newFiles[index], [field]: value };
        setGist({ ...gist, files: newFiles });
    };

    const toggleAccordion = (index: number) => {
        setExpandedFiles(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    const addFile = () => {
        setGist({ ...gist, files: [...gist.files, { ...DEFAULT_FILE }] });
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const isImage = file.type.startsWith('image/');

        reader.onload = (event) => {
            const content = event.target?.result as string;
            setGist(prev => ({
                ...prev,
                files: [...prev.files, {
                    name: file.name,
                    content: content,
                    type: isImage ? 'image' : 'text'
                }]
            }));
        };

        if (isImage) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        if (gist.files.length === 1) return;
        const newFiles = gist.files.filter((_, i) => i !== index);
        setGist({ ...gist, files: newFiles });
        setExpandedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const saveGistUrl = () => {
        const hash = compressGist(gist);
        window.location.hash = hash;
        setMode('view');
    };

    const saveGistBackend = async () => {
        try {
            if (!config.BACKEND_ENABLED) {
                alert('Backend is disabled in URL-only mode');
                return;
            }
            setLoading(true);
            const key = await generateKey();
            const jsonString = JSON.stringify(gist);
            const { iv, content } = await encryptData(jsonString, key);

            // Calculate expiration date
            let expDate = new Date();
            if (expiration === '1d') expDate.setDate(expDate.getDate() + 1);
            if (expiration === '7d') expDate.setDate(expDate.getDate() + 7);
            if (expiration === '30d') expDate.setDate(expDate.getDate() + 30);
            if (expiration === '90d') expDate.setDate(expDate.getDate() + 90);

            // 1. Create Gist Metadata
            const createResponse = await fetch(`${config.API_URL}/api/gists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gist_metadata: { iv: iv },
                    expiration_date: expDate.toISOString(),
                    max_reads: maxReads
                }),
            });

            if (!createResponse.ok) throw new Error('Failed to create gist record');

            const { gist_id, upload_params } = await createResponse.json();

            // 2. Upload to S3 using Presigned POST
            const formData = new FormData();
            Object.entries(upload_params.fields).forEach(([k, v]) => {
                formData.append(k, v as string);
            });
            // Append content as a file/blob
            const blob = new Blob([content], { type: 'text/plain' });
            formData.append('file', blob);

            const uploadResponse = await fetch(upload_params.url, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) throw new Error('Failed to upload content to storage');

            const keyHex = await exportKey(key);
            navigate(`/gist/${gist_id}#${keyHex}`);
            setShowSettings(false);
        } catch (error) {
            console.error(error);
            alert("Failed to create secure gist");
        } finally {
            setLoading(false);
        }
    };

    const createNew = () => {
        setGist({ files: [{ ...DEFAULT_FILE }], description: '' });
        navigate('/');
        setMode('edit');
    };

    const highlightCode = (code: string, filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
        let language = ext;
        if (['ts', 'tsx'].includes(ext)) language = 'typescript';
        if (['js', 'jsx'].includes(ext)) language = 'javascript';
        if (['md', 'markdown'].includes(ext)) language = 'markdown';
        if (['html', 'css', 'json', 'xml', 'yaml', 'yml', 'bash', 'sh'].includes(ext)) language = ext;

        if (hljs.getLanguage(language)) {
            return hljs.highlight(code, { language }).value;
        }
        return hljs.highlightAuto(code).value;
    };

    const processMarkdown = (content: string) => {
        let processed = content;
        gist.files.forEach(f => {
            if (f.type === 'image' && f.name) {
                const escapedName = f.name.replace(/[.*+?^${}()|[\\]/g, '\\$&');
                const regex = new RegExp(`(!\[.*?\])\(${escapedName}\)`, 'g');
                processed = processed.replace(regex, `$1(${f.content})`);
            }
        });
        const rawHtml = marked.parse(processed) as string;
        return DOMPurify.sanitize(rawHtml);
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#0d1117] text-gray-500">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0d1117] dark:text-gray-100 p-4 md:p-8 font-sans transition-colors duration-200">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Modern Header */}
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col gap-2">
                        <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity group">
                            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                                <Code2 className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">SecureGist</h1>
                        </Link>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium ml-1">
                            {mode === 'edit' ? 'Create a secure, anonymous gist' : 'Viewing secure content'}
                        </p>
                        {config.LOCAL_ONLY && (
                            <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 w-fit">
                                URL-only mode
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => setShowInfo(true)} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                            <Info className="w-6 h-6" />
                        </button>

                        {mode === 'view' ? (
                            <>
                                <button onClick={createNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all hover:shadow-md">
                                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
                                </button>
                                {!readOnly && (
                                    <button onClick={() => setMode('edit')} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold transition-all shadow-sm">
                                        <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">Edit</span>
                                    </button>
                                )}
                                <button onClick={() => setShowQR(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all hover:shadow-md">
                                    <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={saveGistUrl} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold transition-all shadow-sm">
                                    <LinkIcon className="w-4 h-4" /> URL Mode
                                </button>
                                {config.BACKEND_ENABLED ? (
                                    <div className="relative" ref={settingsRef}>
                                        <div className="flex rounded-xl shadow-sm bg-blue-600 hover:bg-blue-700 transition-all shadow-blue-500/20">
                                            <button onClick={saveGistBackend} className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold border-r border-blue-500">
                                                <Lock className="w-4 h-4" /> Encrypt & Save
                                            </button>
                                            <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-2.5 text-white hover:bg-blue-800 rounded-r-xl transition-colors">
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {showSettings && (
                                            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                <h4 className="font-semibold text-sm mb-3">Encryption Settings</h4>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Expiration</label>
                                                        <select
                                                            value={expiration}
                                                            onChange={(e) => setExpiration(e.target.value)}
                                                            className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="1d">1 Day</option>
                                                            <option value="7d">7 Days</option>
                                                            <option value="30d">30 Days</option>
                                                            <option value="90d">90 Days</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Max Reads</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="1000"
                                                            value={maxReads}
                                                            onChange={(e) => setMaxReads(parseInt(e.target.value))}
                                                            className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2.5">
                                        Backend disabled
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </header>

                {/* Description */}
                <div className="space-y-2">
                    {mode === 'edit' ? (
                        <input
                            type="text"
                            placeholder="Gist description..."
                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-lg shadow-sm"
                            value={gist.description}
                            onChange={(e) => setGist({ ...gist, description: e.target.value })}
                        />
                    ) : (
                        gist.description && <p className="text-xl text-gray-700 dark:text-gray-300 font-medium px-1">{gist.description}</p>
                    )}
                </div>

                {/* Files Accordion */}
                <div className="space-y-6">
                    {gist.files.map((file, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">

                            {/* File Header */}
                            <div
                                className="bg-gray-50/80 dark:bg-gray-800/80 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => toggleAccordion(index)}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                        {expandedFiles[index] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>

                                    {mode === 'edit' ? (
                                        <input
                                            type="text"
                                            placeholder="Filename..."
                                            className="bg-transparent border-none focus:ring-0 text-sm font-mono font-medium w-full max-w-md text-gray-900 dark:text-gray-100 placeholder-gray-400 py-1"
                                            value={file.name}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleFileChange(index, 'name', e.target.value)}
                                        />
                                    ) : (
                                        <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                            <FileCode className="w-4 h-4" />
                                            {file.name}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {mode === 'edit' && gist.files.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* File Content */}
                            {expandedFiles[index] && (
                                <div className="relative animate-in slide-in-from-top-2 duration-200">
                                    {file.type === 'image' ? (
                                        <div className="p-8 bg-gray-50 dark:bg-[#0d1117] flex flex-col items-center gap-6">
                                            <img src={file.content} alt={file.name} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-sm" />
                                            {mode === 'edit' && (
                                                <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Markdown Embed Code</p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            readOnly
                                                            value={`![${file.name}](${file.name})`}
                                                            className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg select-all text-gray-700 dark:text-gray-300"
                                                            onClick={(e) => e.currentTarget.select()}
                                                        />
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(`![${file.name}](${file.name})`)}
                                                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : mode === 'edit' ? (
                                        <div className="min-h-[200px] max-h-[600px] overflow-y-auto bg-white dark:bg-[#0d1117]">
                                            <Editor
                                                value={file.content}
                                                onValueChange={(code) => handleFileChange(index, 'content', code)}
                                                highlight={(code) => highlightCode(code, file.name)}
                                                padding={20}
                                                style={{
                                                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                                    fontSize: 14,
                                                    minHeight: '200px',
                                                }}
                                                className="font-mono"
                                                textareaClassName="focus:outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto bg-white dark:bg-[#0d1117] p-8 text-sm font-mono leading-relaxed">
                                            {file.name.endsWith('.md') ? (
                                                <article
                                                    className="prose prose-slate max-w-none dark:prose-invert
                                                    prose-headings:border-b prose-headings:border-gray-200 dark:prose-headings:border-gray-800 prose-headings:pb-2 prose-headings:mt-6 prose-headings:mb-4
                                                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                                                    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                                                    prose-pre:bg-gray-50 dark:prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700
                                                    prose-code:text-sm prose-code:font-mono prose-code:bg-gray-100 dark:prose-code:bg-[rgba(110,118,129,0.4)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                                                    prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:p-2 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:p-2
                                                    prose-img:rounded-lg prose-img:shadow-sm
                                                    prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400 prose-blockquote:pl-4
                                                    "
                                                    dangerouslySetInnerHTML={{ __html: processMarkdown(file.content) }}
                                                />
                                            ) : (
                                                <pre className="!bg-transparent !m-0 !p-0">
                                                    <code className={`language-${file.name.split('.').pop() || 'plaintext'}`}>
                                                        {file.content}
                                                    </code>
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add File Actions (Edit only) */}
                {mode === 'edit' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={addFile}
                            className="py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 font-semibold hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                        >
                            <Plus className="w-5 h-5" /> Add Text File
                        </button>
                        <button
                            onClick={triggerFileUpload}
                            className="py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-2 font-semibold hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10"
                        >
                            <Upload className="w-5 h-5" /> Upload File
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="*/*"
                            onChange={handleFileUpload}
                        />
                    </div>
                )}
            </div>

            {/* Share Modal */}
            {showQR && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={() => setShowQR(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full relative animate-in fade-in zoom-in duration-200 flex flex-col gap-6 border border-gray-100 dark:border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Share SecureGist</h3>
                            <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct Link</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={window.location.href}
                                        className="flex-1 px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl select-all outline-none focus:ring-2 focus:ring-blue-500"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button
                                        onClick={() => navigator.clipboard.writeText(window.location.href)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Embed Code</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={`<iframe src="${window.location.href}" width="100%" height="500px" style="border:0;border-radius:12px;overflow:hidden;" sandbox="allow-scripts allow-popups allow-forms allow-same-origin"></iframe>`}
                                        className="flex-1 px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl select-all font-mono outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 dark:text-gray-300"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button
                                        onClick={() => navigator.clipboard.writeText(`<iframe src="${window.location.href}" width="100%" height="500px" style="border:0;border-radius:12px;overflow:hidden;" sandbox="allow-scripts allow-popups allow-forms allow-same-origin"></iframe>`)}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-500">Scan on Mobile</span>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                                <QRCodeSVG value={window.location.href} size={150} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Mechanics Info Modal */}
            {showInfo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={() => setShowInfo(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full relative animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Shield className="w-6 h-6 text-blue-600" />
                                How SecureGist Works
                            </h3>
                            <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <section className="space-y-3">
                                <h4 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Globe className="w-5 h-5 text-emerald-500" />
                                    URL Mode
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    In URL Mode, your data <strong>never leaves your browser</strong>.
                                    The content is compressed using <code>LZString</code> and encoded directly into the URL hash.
                                    This is perfect for small code snippets and sharing via instant messengers.
                                    Since no server is involved, the data is as private as the link itself.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h4 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Lock className="w-5 h-5 text-blue-500" />
                                    Encrypted Mode
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    For larger files or persistent storage, Encrypted Mode uses <strong>End-to-End Encryption (E2E)</strong>.
                                    We use the Web Crypto API (AES-GCM 256-bit) to encrypt your data <em>client-side</em> before it's sent to our server.
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                                    <li>The <strong>Encryption Key</strong> is generated in your browser and included in the URL fragment (after the <code>#</code>).</li>
                                    <li>The server receives only the encrypted blob (ciphertext) and the initialization vector (IV).</li>
                                    <li>The server <strong>never sees</strong> the decryption key or your raw content.</li>
                                    <li>If you lose the URL, the data is <strong>permanently unrecoverable</strong>.</li>
                                </ul>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-900 dark:text-white">
                                        <Eye className="w-4 h-4 text-purple-500" />
                                        Read Limits
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Set a maximum number of times your gist can be read. Once reached, the encrypted blob is automatically deleted from the server.
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-900 dark:text-white">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                        Expiration
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Configure your gist to self-destruct after a set period (1 day to 90 days), ensuring ephemeral sharing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
