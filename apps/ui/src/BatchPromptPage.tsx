import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';

export default function BatchPromptPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      <div className="p-4 border-b border-stone-200 bg-stone-100 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-900">Batch Prompt Setup</h1>
        <Button onClick={() => navigate('/')}>Back</Button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <div className="max-w-lg space-y-4">
          <p>Select a CSV file containing your prompts.</p>
          <Input type="file" accept=".csv" onChange={handleFileChange} />
          {file && <p className="text-sm text-stone-700">Selected: {file.name}</p>}
        </div>
      </div>
    </div>
  );
}
