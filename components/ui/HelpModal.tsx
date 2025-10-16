/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { X, Sparkles, Images, PlayCircle, KeyRound, HelpCircle, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from './Card';
import { Button } from './Button';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: any, replacements?: any) => any;
}

const HelpSection: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 h-10 w-10 mt-1 rounded-lg bg-slate-800/70 flex items-center justify-center">
      <Icon className="h-5 w-5 text-teal-300" />
    </div>
    <div>
      <h4 className="text-lg font-semibold text-slate-100">{title}</h4>
      <div className="text-base text-slate-400 mt-1 space-y-2 prose prose-invert prose-sm prose-p:my-1 prose-ul:my-1">{children}</div>
    </div>
  </div>
);


export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  const helpContent = [
    {
      icon: Sparkles,
      titleKey: "helpStep1Title",
      contentKey: "helpStep1Content"
    },
    {
      icon: Images,
      titleKey: "helpStep2Title",
      contentKey: "helpStep2Content"
    },
    {
      icon: PlayCircle,
      titleKey: "helpStep3Title",
      contentKey: "helpStep3Content"
    },
    {
      icon: KeyRound,
      titleKey: "helpStep4Title",
      contentKey: "helpStep4Content"
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in-0"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-3xl relative max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                <HelpCircle className="h-6 w-6 text-teal-400" />
            </div>
            <div>
                <CardTitle>{t('helpModalTitle')}</CardTitle>
                <CardDescription>{t('helpModalDescription')}</CardDescription>
            </div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto pr-4 space-y-6">
            {helpContent.map((section, index) => {
                const contentData = t(section.contentKey);
                return (
                    <HelpSection key={index} icon={section.icon} title={t(section.titleKey)}>
                        <ul>
                            {Object.entries(contentData).map(([key, value]) => {
                                if (key === 'details_prefix') {
                                    return (
                                        <li key={key}>
                                            <span dangerouslySetInnerHTML={{ __html: value as string }} />
                                            <Pencil className="inline h-4 w-4 -mt-1"/>
                                            <span dangerouslySetInnerHTML={{ __html: contentData.details_suffix }} />
                                        </li>
                                    )
                                }
                                if (key === 'details_suffix') return null; // Handled by prefix
                                return <li key={key} dangerouslySetInnerHTML={{ __html: value as string }} />;
                            })}
                        </ul>
                    </HelpSection>
                )
            })}
        </CardContent>
        <CardFooter className="flex-shrink-0 bg-slate-900/50 border-t border-slate-700/50 flex justify-end">
          <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
        </CardFooter>
      </Card>
      <style>{`
        .prose-invert ul {
          list-style-position: outside;
          padding-left: 1.25rem;
        }
        .prose-invert li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          padding-left: 0.25rem;
        }
      `}</style>
    </div>
  );
};
