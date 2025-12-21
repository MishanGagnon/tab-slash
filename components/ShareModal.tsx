"use client";

import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  shareCode: string;
}

export function ShareModal({ isOpen, onClose, url, shareCode }: ShareModalProps) {
  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-6 shadow-2xl border-2 border-ink relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xs font-bold uppercase opacity-50 hover:opacity-100"
        >
          [ X ]
        </button>

        <div className="text-center space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-widest">
            Share Receipt
          </h2>
          <p className="text-xs uppercase opacity-60 leading-relaxed">
            Scan the QR code or share the code below to join this split.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 border-2 border-ink bg-white">
            <QRCodeSVG value={url} size={180} />
          </div>
          
          <div className="flex flex-col items-center gap-2 w-full">
            <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest">
              Share Code
            </p>
            <div 
              onClick={() => copyToClipboard(shareCode, "Share code")}
              className="text-4xl font-black tracking-[0.2em] border-2 border-dashed border-ink/30 px-6 py-3 cursor-pointer hover:bg-ink/5 transition-all"
            >
              {shareCode}
            </div>
          </div>
        </div>

        <div className="dotted-line"></div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => copyToClipboard(url, "Link")}
            className="w-full border-2 border-ink py-3 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-paper transition-all"
          >
            [ Copy Share Link ]
          </button>
          <button
            onClick={onClose}
            className="w-full text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

