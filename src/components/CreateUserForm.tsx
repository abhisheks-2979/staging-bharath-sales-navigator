import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

interface Manager {
  id: string;
  username: string;
  full_name: string;
}

interface FileUpload {
  file: File;
  type: 'address_proof' | 'id_proof' | 'photo';
  preview?: string;
}

const CreateUserForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
    phone_number: '',
    recovery_email: '',
    hint_question: '',
    hint_answer: '',
    monthly_salary: '',
    daily_da_allowance: '',
    manager_id: '',
    hq: '',
    date_of_joining: '',
    date_of_exit: '',
    alternate_email: '',
    address: '',
    education: '',
    emergency_contact_number: ''
  });

  // Fetch managers for the dropdown
  useEffect(() => {
    const fetchManagers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .order('full_name');

      if (!error && data) {
        setManagers(data);
      }
    };

    fetchManagers();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (type: 'address_proof' | 'id_proof' | 'photo') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Remove existing file of the same type
    setFiles(prev => prev.filter(f => f.type !== type));

    const newFile: FileUpload = { file, type };

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        newFile.preview = e.target?.result as string;
        setFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    } else {
      setFiles(prev => [...prev, newFile]);
    }
  };

  const removeFile = (type: string) => {
    setFiles(prev => prev.filter(f => f.type !== type));
  };

  const uploadFile = async (file: File, userId: string, type: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;
    
    let bucket = 'employee-docs';
    if (type === 'photo') {
      bucket = 'employee-photos';
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      console.error('File upload error:', error);
      return null;
    }

    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user via edge function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: formData
      });

      if (error) throw error;

      const userId = data.user.id;

      // Upload document files (profile photo will be captured on first login)
      const docFiles = files.filter(f => f.type !== 'photo');
      for (const docFile of docFiles) {
        const filePath = await uploadFile(docFile.file, userId, docFile.type);
        if (filePath) {
          await supabase
            .from('employee_documents')
            .insert({
              user_id: userId,
              doc_type: docFile.type as 'address_proof' | 'id_proof',
              file_path: filePath,
              file_name: docFile.file.name,
              content_type: docFile.file.type,
              uploaded_by: userId
            });
        }
      }

      toast({
        title: "Success",
        description: "User created successfully!"
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        username: '',
        full_name: '',
        phone_number: '',
        recovery_email: '',
        hint_question: '',
        hint_answer: '',
        monthly_salary: '',
        daily_da_allowance: '',
        manager_id: '',
        hq: '',
        date_of_joining: '',
        date_of_exit: '',
        alternate_email: '',
        address: '',
        education: '',
        emergency_contact_number: ''
      });
      setFiles([]);

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_number">Emergency Contact</Label>
              <Input
                id="emergency_contact_number"
                value={formData.emergency_contact_number}
                onChange={(e) => handleInputChange('emergency_contact_number', e.target.value)}
              />
            </div>
          </div>

          {/* Employment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_salary">Monthly Salary (₹)</Label>
              <Input
                id="monthly_salary"
                type="number"
                value={formData.monthly_salary}
                onChange={(e) => handleInputChange('monthly_salary', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_da_allowance">Daily DA Allowance (₹)</Label>
              <Input
                id="daily_da_allowance"
                type="number"
                value={formData.daily_da_allowance}
                onChange={(e) => handleInputChange('daily_da_allowance', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager_id">Manager (Reports To)</Label>
              <Select value={formData.manager_id} onValueChange={(value) => handleInputChange('manager_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hq">Head Quarters (HQ)</Label>
              <Input
                id="hq"
                value={formData.hq}
                onChange={(e) => handleInputChange('hq', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_joining">Date of Joining</Label>
              <Input
                id="date_of_joining"
                type="date"
                value={formData.date_of_joining}
                onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_exit">Date of Exit</Label>
              <Input
                id="date_of_exit"
                type="date"
                value={formData.date_of_exit}
                onChange={(e) => handleInputChange('date_of_exit', e.target.value)}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alternate_email">Alternate Email</Label>
              <Input
                id="alternate_email"
                type="email"
                value={formData.alternate_email}
                onChange={(e) => handleInputChange('alternate_email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery_email">Recovery Email</Label>
              <Input
                id="recovery_email"
                type="email"
                value={formData.recovery_email}
                onChange={(e) => handleInputChange('recovery_email', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Education Background</Label>
              <Textarea
                id="education"
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Security Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hint_question">Security Hint Question</Label>
              <Input
                id="hint_question"
                value={formData.hint_question}
                onChange={(e) => handleInputChange('hint_question', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hint_answer">Security Hint Answer</Label>
              <Input
                id="hint_answer"
                value={formData.hint_answer}
                onChange={(e) => handleInputChange('hint_answer', e.target.value)}
              />
            </div>
          </div>

          {/* File Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Documents & Photo</h3>
            <p className="text-sm text-muted-foreground">
              Note: User will capture profile photo via camera on first login
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Address Proof */}
              <div className="space-y-2">
                <Label>Address Proof</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {files.find(f => f.type === 'address_proof') ? (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600">✓ File uploaded</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('address_proof')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload Address Proof</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleFileUpload('address_proof')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* ID Proof */}
              <div className="space-y-2">
                <Label>ID Proof</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {files.find(f => f.type === 'id_proof') ? (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600">✓ File uploaded</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('id_proof')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload ID Proof</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleFileUpload('id_proof')}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating User...
              </>
            ) : (
              'Create User'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateUserForm;