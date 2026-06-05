import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../../services/socket';
import { Pencil, Eraser, Square, Circle, Minus, Trash2, Download, X } from 'lucide-react';

const COLORS = ['#ffffff', '#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'];
const TOOLS = [
  { id: 'pen', icon: Pencil, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
];

export default function Whiteboard({ chatId, onClose }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null); // for shape preview
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastSnapshot = useRef(null); // snapshot before shape draw starts

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [activeUsers, setActiveUsers] = useState([]);
  const { user } = useSelector((s) => s.auth);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    // Join whiteboard socket room & get existing state
    const socket = getSocket();
    if (socket) {
      socket.emit('whiteboard:join', { chatId });

      socket.on('whiteboard:state', ({ canvasData }) => {
        if (canvasData && canvasData !== '{}') {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = canvasData;
        }
      });

      socket.on('whiteboard:draw', ({ drawData }) => {
        applyDrawData(ctx, drawData);
      });

      socket.on('whiteboard:cleared', () => {
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      socket.on('whiteboard:user_joined', ({ userId }) => {
        setActiveUsers((prev) => [...new Set([...prev, userId])]);
      });

      socket.on('whiteboard:user_left', ({ userId }) => {
        setActiveUsers((prev) => prev.filter((id) => id !== userId));
      });
    }

    const handleResize = () => {
      const imageData = canvas.toDataURL();
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = imageData;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket?.emit('whiteboard:leave', { chatId });
      socket?.off('whiteboard:state');
      socket?.off('whiteboard:draw');
      socket?.off('whiteboard:cleared');
      socket?.off('whiteboard:user_joined');
      socket?.off('whiteboard:user_left');
    };
  }, [chatId]);

  const applyDrawData = (ctx, data) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.tool === 'pen' || data.tool === 'eraser') {
      if (data.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = data.lineWidth * 4;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (data.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    } else if (data.tool === 'rect') {
      ctx.strokeRect(data.x0, data.y0, data.x1 - data.x0, data.y1 - data.y0);
    } else if (data.tool === 'circle') {
      const rx = Math.abs(data.x1 - data.x0) / 2;
      const ry = Math.abs(data.y1 - data.y0) / 2;
      ctx.beginPath();
      ctx.ellipse(data.x0 + (data.x1 - data.x0) / 2, data.y0 + (data.y1 - data.y0) / 2, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e) => {
    isDrawing.current = true;
    const pos = getPos(e);
    startPos.current = pos;
    if (['rect', 'circle', 'line'].includes(tool)) {
      lastSnapshot.current = ctxRef.current.getImageData(
        0, 0, canvasRef.current.width, canvasRef.current.height
      );
    }
    if (tool === 'pen' || tool === 'eraser') {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(pos.x, pos.y);
    }
  };

  const onPointerMove = (e) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    const ctx = ctxRef.current;
    const socket = getSocket();

    if (tool === 'pen' || tool === 'eraser') {
      const drawData = {
        tool, color, lineWidth,
        x0: startPos.current.x, y0: startPos.current.y,
        x1: pos.x, y1: pos.y,
      };
      applyDrawData(ctx, drawData);
      socket?.emit('whiteboard:draw', { chatId, drawData });
      startPos.current = pos;
    } else {
      // Shape preview: restore snapshot then draw ghost
      if (lastSnapshot.current) ctx.putImageData(lastSnapshot.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      applyDrawData(ctx, {
        tool, color, lineWidth,
        x0: startPos.current.x, y0: startPos.current.y,
        x1: pos.x, y1: pos.y,
      });
    }
  };

  const onPointerUp = (e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const pos = getPos(e);
    const socket = getSocket();

    if (['rect', 'circle', 'line'].includes(tool)) {
      const drawData = {
        tool, color, lineWidth,
        x0: startPos.current.x, y0: startPos.current.y,
        x1: pos.x, y1: pos.y,
      };
      socket?.emit('whiteboard:draw', { chatId, drawData });
    }

    // Auto-save every few strokes
    const canvasData = canvasRef.current.toDataURL('image/png', 0.5);
    socket?.emit('whiteboard:save', { chatId, canvasData });
  };

  const handleClear = () => {
    const ctx = ctxRef.current;
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    getSocket()?.emit('whiteboard:clear', { chatId });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `nexchat-whiteboard-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-900 border-b border-surface-800 flex-wrap">
        <span className="text-sm font-semibold text-white mr-2">Whiteboard</span>

        {/* Tools */}
        <div className="flex items-center gap-1 bg-surface-800 rounded-lg p-1">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={label}
              className={`p-2 rounded-md transition ${tool === id ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-surface-700'}`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Stroke width */}
        <input
          type="range" min="1" max="20" value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="w-20 accent-brand-500"
          title="Stroke width"
        />
        <span className="text-xs text-zinc-500 w-4">{lineWidth}</span>

        {/* Active users badge */}
        {activeUsers.length > 0 && (
          <span className="text-xs text-zinc-400 ml-auto mr-2">
            {activeUsers.length + 1} drawing
          </span>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={handleDownload} title="Download" className="btn-ghost p-2"><Download size={16} /></button>
          <button onClick={handleClear} title="Clear all" className="btn-ghost p-2 text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
          <button onClick={onClose} title="Close" className="btn-ghost p-2"><X size={16} /></button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>
    </div>
  );
}
