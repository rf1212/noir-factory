import { useState } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { useCompanyStore } from '../store/companyStore';
import { motion, AnimatePresence } from 'framer-motion';

export function CompanySwitcher() {
  const { companies, currentCompany, setCurrentCompany } = useCompanyStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentCompany || companies.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="w-5 h-5 text-accent-primary" />
        <span className="text-sm font-semibold text-text-secondary">{currentCompany?.name || 'Company'}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-noir-surface-hover transition-all duration-200 min-h-[44px] group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Building2 className="w-5 h-5 text-accent-primary" />
        <span className="text-sm font-semibold text-text-primary">{currentCompany.name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-64 bg-noir-surface border border-noir-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-3 space-y-1">
              {companies.map((company) => (
                <motion.button
                  key={company.id}
                  onClick={() => {
                    setCurrentCompany(company);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 min-h-[44px] ${
                    currentCompany.id === company.id
                      ? 'bg-accent-primary/10 border border-accent-primary/30'
                      : 'hover:bg-noir-surface-hover border border-transparent'
                  }`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`font-semibold text-sm ${currentCompany.id === company.id ? 'text-accent-primary' : 'text-text-primary'}`}>
                    {company.name}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{company.slug}</div>
                  {currentCompany.id === company.id && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-accent-primary rounded-full" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
