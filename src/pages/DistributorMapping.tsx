import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Building2, Search, Edit, Trash2, Phone, Mail, MapPin, 
  FileText, Upload, Settings2, CreditCard, Users, MapPinned, Paperclip,
  TrendingUp, Factory, Truck, User, ChevronDown, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const DISTRIBUTOR_STATUSES = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-blue-100 text-blue-800' },
  { value: 'applied', label: 'Applied', color: 'bg-purple-100 text-purple-800' },
  { value: 'evaluating', label: 'Evaluating', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'documentation', label: 'Documentation', color: 'bg-orange-100 text-orange-800' },
  { value: 'dropped', label: 'Dropped', color: 'bg-red-100 text-red-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' }
];

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  status: string;
  distributor_status?: string;
  credit_limit: number;
  outstanding_amount: number;
  gst_number?: string;
  parent_id?: string;
  parent_name?: string;
  territory?: string;
  territory_id?: string;
  created_at: string;
  beat_ids?: string[];
  beat_names?: string[];
  established_year?: number;
  products_distributed?: string[];
  other_products?: string[];
  assets_trucks?: number;
  assets_vans?: number;
  sales_team_size?: number;
  coverage_area?: string;
  annual_revenue?: number;
  profitability?: string;
  business_hunger?: string;
  about_business?: string;
}

interface SuperStockist {
  id: string;
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  city?: string;
  state?: string;
  competitors: string[];
  region_pincodes: string[];
  is_approved: boolean;
  stockist_status?: string;
  created_at: string;
  established_year?: number;
  products_distributed?: string[];
  other_products?: string[];
  assets_trucks?: number;
  assets_vans?: number;
  sales_team_size?: number;
  coverage_area?: string;
  annual_revenue?: number;
  profitability?: string;
  business_hunger?: string;
  about_business?: string;
}

interface Contact {
  id: string;
  contact_name: string;
  designation?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary: boolean;
  reports_to?: string;
}

interface Location {
  id: string;
  location_name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_head_office: boolean;
  contact_phone?: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  created_at: string;
}

interface Beat {
  id: string;
  beat_name: string;
  beat_id: string;
}

const DistributorMapping = () => {
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('distributors');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [superStockists, setSuperStockists] = useState<SuperStockist[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [beatFilter, setBeatFilter] = useState('all');
  const [stockistSearchTerm, setStockistSearchTerm] = useState('');
  
  // Modals
  const [showAddDistributorModal, setShowAddDistributorModal] = useState(false);
  const [showAddStockistModal, setShowAddStockistModal] = useState(false);
  const [showMassEditModal, setShowMassEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewModalTab, setViewModalTab] = useState('details');
  
  // Selected items
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [selectedStockist, setSelectedStockist] = useState<SuperStockist | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'distributor' | 'stockist'; id: string; name: string } | null>(null);
  
  // Contacts, Locations, Attachments
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mappedDistributors, setMappedDistributors] = useState<Distributor[]>([]);
  
  // Form states
  const [distributorForm, setDistributorForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    gst_number: '',
    parent_id: '',
    territory_id: '',
    beat_ids: [] as string[],
    distributor_status: 'prospecting',
    established_year: '',
    products_distributed: [] as string[],
    other_products: '',
    assets_trucks: '',
    assets_vans: '',
    sales_team_size: '',
    coverage_area: '',
    annual_revenue: '',
    profitability: '',
    business_hunger: '',
    about_business: ''
  });
  
  const [stockistForm, setStockistForm] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    state: '',
    competitors: [] as string[],
    region_pincodes: [] as string[],
    stockist_status: 'prospecting',
    established_year: '',
    products_distributed: [] as string[],
    other_products: '',
    assets_trucks: '',
    assets_vans: '',
    sales_team_size: '',
    coverage_area: '',
    annual_revenue: '',
    profitability: '',
    business_hunger: '',
    about_business: ''
  });
  
  const [massEditStockistId, setMassEditStockistId] = useState('');
  const [newContact, setNewContact] = useState<Partial<Contact>>({});
  const [newLocation, setNewLocation] = useState<Partial<Location>>({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [distributorsRes, stockistsRes, beatsRes, territoriesRes, categoriesRes] = await Promise.all([
        supabase
          .from('distributors')
          .select(`
            *,
            parent:vendors!parent_id(name),
            territory:territories(name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('vendors')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('beats')
          .select('id, beat_name, beat_id')
          .eq('is_active', true)
          .order('beat_name'),
        supabase
          .from('territories')
          .select('id, name')
          .order('name'),
        supabase
          .from('product_categories')
          .select('id, name')
          .order('name')
      ]);

      if (distributorsRes.error) throw distributorsRes.error;
      
      const distributorIds = (distributorsRes.data || []).map(d => d.id);
      let beatMappings: any[] = [];
      
      if (distributorIds.length > 0) {
        const { data: mappingsData } = await supabase
          .from('distributor_beat_mappings')
          .select('distributor_id, beat_id, beats(beat_name)')
          .in('distributor_id', distributorIds);
        beatMappings = mappingsData || [];
      }

      const mappedDistributors = (distributorsRes.data || []).map(d => {
        const distributorMappings = beatMappings.filter(m => m.distributor_id === d.id);
        return {
          ...d,
          parent_name: (d.parent as any)?.name,
          territory: (d.territory as any)?.name,
          credit_limit: Number(d.credit_limit || 0),
          outstanding_amount: Number(d.outstanding_amount || 0),
          beat_ids: distributorMappings.map(m => m.beat_id),
          beat_names: distributorMappings.map(m => m.beats?.beat_name).filter(Boolean)
        };
      });

      setDistributors(mappedDistributors);
      setSuperStockists((stockistsRes.data || []).map(ss => ({
        ...ss,
        competitors: ss.skills || []
      })));
      setBeats(beatsRes.data || []);
      setTerritories(territoriesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContactsAndLocations = async (type: 'distributor' | 'stockist', id: string) => {
    try {
      const contactTable = type === 'distributor' ? 'distributor_contacts' : 'stockist_contacts';
      const locationTable = type === 'distributor' ? 'distributor_locations' : 'stockist_locations';
      const attachmentTable = type === 'distributor' ? 'distributor_attachments' : 'stockist_attachments';
      const idField = type === 'distributor' ? 'distributor_id' : 'stockist_id';

      if (type === 'distributor') {
        const [contactsRes, locationsRes, attachmentsRes] = await Promise.all([
          supabase.from('distributor_contacts').select('*').eq('distributor_id', id).order('is_primary', { ascending: false }),
          supabase.from('distributor_locations').select('*').eq('distributor_id', id).order('is_head_office', { ascending: false }),
          supabase.from('distributor_attachments').select('*').eq('distributor_id', id).order('created_at', { ascending: false })
        ]);
        setContacts(contactsRes.data || []);
        setLocations(locationsRes.data || []);
        setAttachments(attachmentsRes.data || []);
      } else {
        const [contactsRes, locationsRes, attachmentsRes] = await Promise.all([
          supabase.from('stockist_contacts').select('*').eq('stockist_id', id).order('is_primary', { ascending: false }),
          supabase.from('stockist_locations').select('*').eq('stockist_id', id).order('is_head_office', { ascending: false }),
          supabase.from('stockist_attachments').select('*').eq('stockist_id', id).order('created_at', { ascending: false })
        ]);
        setContacts(contactsRes.data || []);
        setLocations(locationsRes.data || []);
        setAttachments(attachmentsRes.data || []);
      }

      if (type === 'stockist') {
        const { data: mappedData } = await supabase
          .from('distributors')
          .select('*')
          .eq('parent_id', id);
        setMappedDistributors(mappedData || []);
      }
    } catch (error) {
      console.error('Error loading contacts/locations:', error);
    }
  };

  const filteredDistributors = distributors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
      d.distributor_status === statusFilter || 
      d.status === statusFilter;
    const matchesBeat = beatFilter === 'all' || d.beat_ids?.includes(beatFilter);
    return matchesSearch && matchesStatus && matchesBeat;
  });

  const filteredStockists = superStockists.filter(ss => {
    const matchesSearch = ss.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ss.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ss.contact_phone?.includes(searchTerm) ||
      ss.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      ss.stockist_status === statusFilter ||
      (statusFilter === 'active' && ss.is_approved) ||
      (statusFilter === 'inactive' && !ss.is_approved);
    return matchesSearch && matchesStatus;
  });

  const filteredStockistsForDropdown = superStockists.filter(ss =>
    ss.name.toLowerCase().includes(stockistSearchTerm.toLowerCase())
  );

  const handleSaveDistributor = async () => {
    try {
      if (!distributorForm.name || !distributorForm.contact_person || !distributorForm.phone) {
        toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
        return;
      }

      const saveData = {
        name: distributorForm.name,
        contact_person: distributorForm.contact_person,
        phone: distributorForm.phone,
        email: distributorForm.email || null,
        address: distributorForm.address || null,
        credit_limit: Number(distributorForm.credit_limit || 0),
        gst_number: distributorForm.gst_number || null,
        parent_id: distributorForm.parent_id || null,
        parent_type: distributorForm.parent_id ? 'super_stockist' : null,
        territory_id: distributorForm.territory_id || null,
        status: distributorForm.distributor_status === 'active' ? 'active' : 'inactive',
        distributor_status: distributorForm.distributor_status,
        established_year: distributorForm.established_year ? Number(distributorForm.established_year) : null,
        products_distributed: distributorForm.products_distributed,
        other_products: distributorForm.other_products ? distributorForm.other_products.split(',').map(p => p.trim()) : null,
        assets_trucks: distributorForm.assets_trucks ? Number(distributorForm.assets_trucks) : 0,
        assets_vans: distributorForm.assets_vans ? Number(distributorForm.assets_vans) : 0,
        sales_team_size: distributorForm.sales_team_size ? Number(distributorForm.sales_team_size) : 0,
        coverage_area: distributorForm.coverage_area || null,
        annual_revenue: distributorForm.annual_revenue ? Number(distributorForm.annual_revenue) : null,
        profitability: distributorForm.profitability || null,
        business_hunger: distributorForm.business_hunger || null,
        about_business: distributorForm.about_business || null
      };

      let distributorId: string;

      if (selectedDistributor && isEditing) {
        const { error } = await supabase.from('distributors').update(saveData).eq('id', selectedDistributor.id);
        if (error) throw error;
        distributorId = selectedDistributor.id;
      } else {
        const { data, error } = await supabase.from('distributors').insert(saveData).select().single();
        if (error) throw error;
        distributorId = data.id;
      }

      await supabase.from('distributor_beat_mappings').delete().eq('distributor_id', distributorId);

      if (distributorForm.beat_ids.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const beatMappings = distributorForm.beat_ids.map(beatId => ({
          distributor_id: distributorId,
          beat_id: beatId,
          created_by: user?.id
        }));
        await supabase.from('distributor_beat_mappings').insert(beatMappings);
      }

      toast({ title: 'Success', description: `Distributor ${isEditing ? 'updated' : 'added'} successfully` });
      setShowAddDistributorModal(false);
      setShowViewModal(false);
      resetDistributorForm();
      loadData();
    } catch (error) {
      console.error('Error saving distributor:', error);
      toast({ title: 'Error', description: 'Failed to save distributor', variant: 'destructive' });
    }
  };

  const handleSaveStockist = async () => {
    try {
      if (!stockistForm.name) {
        toast({ title: 'Error', description: 'Please fill in the name field', variant: 'destructive' });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const saveData = {
        name: stockistForm.name,
        contact_name: stockistForm.contact_name || null,
        contact_phone: stockistForm.contact_phone || null,
        contact_email: stockistForm.contact_email || null,
        city: stockistForm.city || null,
        state: stockistForm.state || null,
        skills: stockistForm.competitors,
        region_pincodes: stockistForm.region_pincodes,
        is_approved: stockistForm.stockist_status === 'active',
        stockist_status: stockistForm.stockist_status,
        established_year: stockistForm.established_year ? Number(stockistForm.established_year) : null,
        products_distributed: stockistForm.products_distributed,
        other_products: stockistForm.other_products ? stockistForm.other_products.split(',').map(p => p.trim()) : null,
        assets_trucks: stockistForm.assets_trucks ? Number(stockistForm.assets_trucks) : 0,
        assets_vans: stockistForm.assets_vans ? Number(stockistForm.assets_vans) : 0,
        sales_team_size: stockistForm.sales_team_size ? Number(stockistForm.sales_team_size) : 0,
        coverage_area: stockistForm.coverage_area || null,
        annual_revenue: stockistForm.annual_revenue ? Number(stockistForm.annual_revenue) : null,
        profitability: stockistForm.profitability || null,
        business_hunger: stockistForm.business_hunger || null,
        about_business: stockistForm.about_business || null
      };

      if (selectedStockist && isEditing) {
        const { error } = await supabase.from('vendors').update(saveData).eq('id', selectedStockist.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vendors').insert({ ...saveData, created_by: user.id });
        if (error) throw error;
      }

      toast({ title: 'Success', description: `Super Stockist ${isEditing ? 'updated' : 'added'} successfully` });
      setShowAddStockistModal(false);
      setShowViewModal(false);
      resetStockistForm();
      loadData();
    } catch (error) {
      console.error('Error saving stockist:', error);
      toast({ title: 'Error', description: 'Failed to save super stockist', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'distributor') {
        await supabase.from('distributors').delete().eq('id', deleteTarget.id);
      } else {
        await supabase.from('vendors').delete().eq('id', deleteTarget.id);
      }
      toast({ title: 'Success', description: `${deleteTarget.type === 'distributor' ? 'Distributor' : 'Super Stockist'} deleted successfully` });
      setShowDeleteDialog(false);
      setShowViewModal(false);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleMassEditSave = async () => {
    try {
      if (selectedIds.length === 0) {
        toast({ title: 'Error', description: 'Please select at least one distributor', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('distributors')
        .update({ parent_id: massEditStockistId || null, parent_type: massEditStockistId ? 'super_stockist' : null })
        .in('id', selectedIds);

      if (error) throw error;

      toast({ title: 'Success', description: `${selectedIds.length} distributor(s) reassigned successfully` });
      setShowMassEditModal(false);
      setSelectedIds([]);
      setMassEditStockistId('');
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reassign distributors', variant: 'destructive' });
    }
  };

  const handleAddContact = async () => {
    if (!newContact.contact_name) {
      toast({ title: 'Error', description: 'Contact name is required', variant: 'destructive' });
      return;
    }
    try {
      const id = selectedDistributor?.id || selectedStockist?.id;
      
      if (selectedDistributor) {
        await supabase.from('distributor_contacts').insert({ 
          contact_name: newContact.contact_name!, 
          designation: newContact.designation,
          phone: newContact.phone,
          email: newContact.email,
          address: newContact.address,
          is_primary: newContact.is_primary,
          reports_to: newContact.reports_to,
          distributor_id: id 
        });
      } else {
        await supabase.from('stockist_contacts').insert({ 
          contact_name: newContact.contact_name!, 
          designation: newContact.designation,
          phone: newContact.phone,
          email: newContact.email,
          address: newContact.address,
          is_primary: newContact.is_primary,
          reports_to: newContact.reports_to,
          stockist_id: id 
        });
      }
      toast({ title: 'Success', description: 'Contact added successfully' });
      setNewContact({});
      setShowAddContact(false);
      loadContactsAndLocations(selectedDistributor ? 'distributor' : 'stockist', id!);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add contact', variant: 'destructive' });
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.location_name) {
      toast({ title: 'Error', description: 'Location name is required', variant: 'destructive' });
      return;
    }
    try {
      const id = selectedDistributor?.id || selectedStockist?.id;
      
      if (selectedDistributor) {
        await supabase.from('distributor_locations').insert({ 
          location_name: newLocation.location_name!, 
          address: newLocation.address,
          city: newLocation.city,
          state: newLocation.state,
          pincode: newLocation.pincode,
          is_head_office: newLocation.is_head_office,
          contact_phone: newLocation.contact_phone,
          distributor_id: id 
        });
      } else {
        await supabase.from('stockist_locations').insert({ 
          location_name: newLocation.location_name!, 
          address: newLocation.address,
          city: newLocation.city,
          state: newLocation.state,
          pincode: newLocation.pincode,
          is_head_office: newLocation.is_head_office,
          contact_phone: newLocation.contact_phone,
          stockist_id: id 
        });
      }
      toast({ title: 'Success', description: 'Location added successfully' });
      setNewLocation({});
      setShowAddLocation(false);
      loadContactsAndLocations(selectedDistributor ? 'distributor' : 'stockist', id!);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add location', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const table = selectedDistributor ? 'distributor_attachments' : 'stockist_attachments';
      const idField = selectedDistributor ? 'distributor_id' : 'stockist_id';
      const id = selectedDistributor?.id || selectedStockist?.id;
      const bucket = 'branding-documents';
      const filePath = `${idField}/${id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

      await supabase.from(table).insert({
        [idField]: id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user?.id
      });

      toast({ title: 'Success', description: 'File uploaded successfully' });
      loadContactsAndLocations(selectedDistributor ? 'distributor' : 'stockist', id!);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
    }
  };

  const resetDistributorForm = () => {
    setDistributorForm({
      name: '', contact_person: '', phone: '', email: '', address: '', credit_limit: '', gst_number: '',
      parent_id: '', territory_id: '', beat_ids: [], distributor_status: 'prospecting',
      established_year: '', products_distributed: [], other_products: '', assets_trucks: '', assets_vans: '',
      sales_team_size: '', coverage_area: '', annual_revenue: '', profitability: '', business_hunger: '', about_business: ''
    });
    setSelectedDistributor(null);
    setIsEditing(false);
  };

  const resetStockistForm = () => {
    setStockistForm({
      name: '', contact_name: '', contact_phone: '', contact_email: '', city: '', state: '',
      competitors: [], region_pincodes: [], stockist_status: 'prospecting',
      established_year: '', products_distributed: [], other_products: '', assets_trucks: '', assets_vans: '',
      sales_team_size: '', coverage_area: '', annual_revenue: '', profitability: '', business_hunger: '', about_business: ''
    });
    setSelectedStockist(null);
    setIsEditing(false);
  };

  const openDistributorView = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setSelectedStockist(null);
    setDistributorForm({
      name: distributor.name,
      contact_person: distributor.contact_person,
      phone: distributor.phone,
      email: distributor.email || '',
      address: distributor.address || '',
      credit_limit: distributor.credit_limit.toString(),
      gst_number: distributor.gst_number || '',
      parent_id: distributor.parent_id || '',
      territory_id: distributor.territory_id || '',
      beat_ids: distributor.beat_ids || [],
      distributor_status: distributor.distributor_status || 'active',
      established_year: distributor.established_year?.toString() || '',
      products_distributed: distributor.products_distributed || [],
      other_products: distributor.other_products?.join(', ') || '',
      assets_trucks: distributor.assets_trucks?.toString() || '',
      assets_vans: distributor.assets_vans?.toString() || '',
      sales_team_size: distributor.sales_team_size?.toString() || '',
      coverage_area: distributor.coverage_area || '',
      annual_revenue: distributor.annual_revenue?.toString() || '',
      profitability: distributor.profitability || '',
      business_hunger: distributor.business_hunger || '',
      about_business: distributor.about_business || ''
    });
    setIsEditing(false);
    setViewModalTab('details');
    setShowViewModal(true);
    loadContactsAndLocations('distributor', distributor.id);
  };

  const openStockistView = (stockist: SuperStockist) => {
    setSelectedStockist(stockist);
    setSelectedDistributor(null);
    setStockistForm({
      name: stockist.name,
      contact_name: stockist.contact_name || '',
      contact_phone: stockist.contact_phone || '',
      contact_email: stockist.contact_email || '',
      city: stockist.city || '',
      state: stockist.state || '',
      competitors: stockist.competitors || [],
      region_pincodes: stockist.region_pincodes || [],
      stockist_status: stockist.stockist_status || (stockist.is_approved ? 'active' : 'inactive'),
      established_year: stockist.established_year?.toString() || '',
      products_distributed: stockist.products_distributed || [],
      other_products: stockist.other_products?.join(', ') || '',
      assets_trucks: stockist.assets_trucks?.toString() || '',
      assets_vans: stockist.assets_vans?.toString() || '',
      sales_team_size: stockist.sales_team_size?.toString() || '',
      coverage_area: stockist.coverage_area || '',
      annual_revenue: stockist.annual_revenue?.toString() || '',
      profitability: stockist.profitability || '',
      business_hunger: stockist.business_hunger || '',
      about_business: stockist.about_business || ''
    });
    setIsEditing(false);
    setViewModalTab('details');
    setShowViewModal(true);
    loadContactsAndLocations('stockist', stockist.id);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDistributors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDistributors.map(d => d.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = DISTRIBUTOR_STATUSES.find(s => s.value === status);
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800';
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Distributor & Stockist Master</h1>
                <p className="text-primary-foreground/80 text-sm sm:text-base mt-1">
                  Manage your distributor and stockist network
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => { resetDistributorForm(); setShowAddDistributorModal(true); }}
                  className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                >
                  <Plus size={16} className="mr-2" />
                  Add Distributor
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-7xl mx-auto space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search by name, phone, address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {DISTRIBUTOR_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeTab === 'distributors' && selectedIds.length > 0 && (
                    <Button variant="outline" onClick={() => setShowMassEditModal(true)} className="gap-2">
                      <Settings2 size={16} />
                      Mass Edit ({selectedIds.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="distributors">Distributors ({filteredDistributors.length})</TabsTrigger>
              <TabsTrigger value="stockists">Super Stockists ({filteredStockists.length})</TabsTrigger>
            </TabsList>

            {/* Distributors Tab */}
            <TabsContent value="distributors" className="space-y-4 mt-4">
              {filteredDistributors.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No distributors found</p>
                    <Button onClick={() => { resetDistributorForm(); setShowAddDistributorModal(true); }} className="mt-4">
                      <Plus size={16} className="mr-2" />Add Distributor
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
                    <Checkbox
                      checked={selectedIds.length === filteredDistributors.length && filteredDistributors.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                  
                  {filteredDistributors.map(distributor => (
                    <Card key={distributor.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedIds.includes(distributor.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedIds(prev => [...prev, distributor.id]);
                              else setSelectedIds(prev => prev.filter(id => id !== distributor.id));
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1" onClick={() => openDistributorView(distributor)}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">{distributor.name}</h3>
                                <p className="text-sm text-muted-foreground">{distributor.contact_person}</p>
                              </div>
                              <Badge className={getStatusBadge(distributor.distributor_status || distributor.status)}>
                                {DISTRIBUTOR_STATUSES.find(s => s.value === (distributor.distributor_status || distributor.status))?.label || distributor.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone size={14} />{distributor.phone}
                              </div>
                              {distributor.parent_name && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Building2 size={14} />{distributor.parent_name}
                                </div>
                              )}
                              {distributor.credit_limit > 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <CreditCard size={14} />{formatCurrency(distributor.credit_limit)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Super Stockists Tab */}
            <TabsContent value="stockists" className="space-y-4 mt-4">
              <div className="flex justify-end mb-2">
                <Button onClick={() => { resetStockistForm(); setShowAddStockistModal(true); }}>
                  <Plus size={16} className="mr-2" />Add Super Stockist
                </Button>
              </div>
              
              {filteredStockists.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No super stockists found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredStockists.map(stockist => (
                    <Card key={stockist.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStockistView(stockist)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{stockist.name}</h3>
                            {stockist.contact_name && <p className="text-sm text-muted-foreground">{stockist.contact_name}</p>}
                          </div>
                          <Badge className={getStatusBadge(stockist.stockist_status || (stockist.is_approved ? 'active' : 'inactive'))}>
                            {DISTRIBUTOR_STATUSES.find(s => s.value === (stockist.stockist_status || (stockist.is_approved ? 'active' : 'inactive')))?.label || 'Active'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
                          {stockist.contact_phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone size={14} />{stockist.contact_phone}
                            </div>
                          )}
                          {(stockist.city || stockist.state) && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin size={14} />{[stockist.city, stockist.state].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Add Distributor Modal */}
        <Dialog open={showAddDistributorModal} onOpenChange={setShowAddDistributorModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Distributor</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="business">Business Details</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Company Name *</label>
                    <Input value={distributorForm.name} onChange={(e) => setDistributorForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter company name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={distributorForm.distributor_status} onValueChange={(val) => setDistributorForm(prev => ({ ...prev, distributor_status: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DISTRIBUTOR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contact Person *</label>
                    <Input value={distributorForm.contact_person} onChange={(e) => setDistributorForm(prev => ({ ...prev, contact_person: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone *</label>
                    <Input value={distributorForm.phone} onChange={(e) => setDistributorForm(prev => ({ ...prev, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input value={distributorForm.email} onChange={(e) => setDistributorForm(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">GST Number</label>
                    <Input value={distributorForm.gst_number} onChange={(e) => setDistributorForm(prev => ({ ...prev, gst_number: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Credit Limit (₹)</label>
                    <Input type="number" value={distributorForm.credit_limit} onChange={(e) => setDistributorForm(prev => ({ ...prev, credit_limit: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Select Super Stockist</label>
                    <Select value={distributorForm.parent_id} onValueChange={(val) => setDistributorForm(prev => ({ ...prev, parent_id: val }))}>
                      <SelectTrigger><SelectValue placeholder="Search and select..." /></SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input placeholder="Search stockist..." value={stockistSearchTerm} onChange={(e) => setStockistSearchTerm(e.target.value)} className="mb-2" />
                        </div>
                        <SelectItem value="">None</SelectItem>
                        {filteredStockistsForDropdown.map(ss => <SelectItem key={ss.id} value={ss.id}>{ss.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Textarea value={distributorForm.address} onChange={(e) => setDistributorForm(prev => ({ ...prev, address: e.target.value }))} />
                </div>
              </TabsContent>
              <TabsContent value="business" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Established Year</label>
                    <Input type="number" value={distributorForm.established_year} onChange={(e) => setDistributorForm(prev => ({ ...prev, established_year: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Annual Revenue (₹)</label>
                    <Input type="number" value={distributorForm.annual_revenue} onChange={(e) => setDistributorForm(prev => ({ ...prev, annual_revenue: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sales Team Size</label>
                    <Input type="number" value={distributorForm.sales_team_size} onChange={(e) => setDistributorForm(prev => ({ ...prev, sales_team_size: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Trucks</label>
                    <Input type="number" value={distributorForm.assets_trucks} onChange={(e) => setDistributorForm(prev => ({ ...prev, assets_trucks: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vans</label>
                    <Input type="number" value={distributorForm.assets_vans} onChange={(e) => setDistributorForm(prev => ({ ...prev, assets_vans: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Products Distributed (select)</label>
                  <div className="grid grid-cols-3 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={distributorForm.products_distributed.includes(cat.name)}
                          onCheckedChange={(checked) => {
                            if (checked) setDistributorForm(prev => ({ ...prev, products_distributed: [...prev.products_distributed, cat.name] }));
                            else setDistributorForm(prev => ({ ...prev, products_distributed: prev.products_distributed.filter(p => p !== cat.name) }));
                          }}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Other Products (comma separated)</label>
                  <Input value={distributorForm.other_products} onChange={(e) => setDistributorForm(prev => ({ ...prev, other_products: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Coverage Area</label>
                    <Input value={distributorForm.coverage_area} onChange={(e) => setDistributorForm(prev => ({ ...prev, coverage_area: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Profitability</label>
                    <Select value={distributorForm.profitability} onValueChange={(val) => setDistributorForm(prev => ({ ...prev, profitability: val }))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Business Hunger (Strategic orientation)</label>
                  <Select value={distributorForm.business_hunger} onValueChange={(val) => setDistributorForm(prev => ({ ...prev, business_hunger: val }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growth_oriented">Growth Oriented</SelectItem>
                      <SelectItem value="strategic">Strategic</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="conservative">Conservative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">About Business</label>
                  <Textarea value={distributorForm.about_business} onChange={(e) => setDistributorForm(prev => ({ ...prev, about_business: e.target.value }))} rows={3} />
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDistributorModal(false)}>Cancel</Button>
              <Button onClick={handleSaveDistributor}>Add Distributor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Super Stockist Modal */}
        <Dialog open={showAddStockistModal} onOpenChange={setShowAddStockistModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Super Stockist</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="business">Business Details</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input value={stockistForm.name} onChange={(e) => setStockistForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={stockistForm.stockist_status} onValueChange={(val) => setStockistForm(prev => ({ ...prev, stockist_status: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DISTRIBUTOR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contact Person</label>
                    <Input value={stockistForm.contact_name} onChange={(e) => setStockistForm(prev => ({ ...prev, contact_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input value={stockistForm.contact_phone} onChange={(e) => setStockistForm(prev => ({ ...prev, contact_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input value={stockistForm.contact_email} onChange={(e) => setStockistForm(prev => ({ ...prev, contact_email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input value={stockistForm.city} onChange={(e) => setStockistForm(prev => ({ ...prev, city: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <Input value={stockistForm.state} onChange={(e) => setStockistForm(prev => ({ ...prev, state: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Region Pincodes (comma separated)</label>
                  <Input value={stockistForm.region_pincodes.join(', ')} onChange={(e) => setStockistForm(prev => ({ ...prev, region_pincodes: e.target.value.split(',').map(p => p.trim()).filter(p => p) }))} />
                </div>
              </TabsContent>
              <TabsContent value="business" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Established Year</label>
                    <Input type="number" value={stockistForm.established_year} onChange={(e) => setStockistForm(prev => ({ ...prev, established_year: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Annual Revenue (₹)</label>
                    <Input type="number" value={stockistForm.annual_revenue} onChange={(e) => setStockistForm(prev => ({ ...prev, annual_revenue: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sales Team Size</label>
                    <Input type="number" value={stockistForm.sales_team_size} onChange={(e) => setStockistForm(prev => ({ ...prev, sales_team_size: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Trucks</label>
                    <Input type="number" value={stockistForm.assets_trucks} onChange={(e) => setStockistForm(prev => ({ ...prev, assets_trucks: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vans</label>
                    <Input type="number" value={stockistForm.assets_vans} onChange={(e) => setStockistForm(prev => ({ ...prev, assets_vans: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Products Distributed</label>
                  <div className="grid grid-cols-3 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={stockistForm.products_distributed.includes(cat.name)}
                          onCheckedChange={(checked) => {
                            if (checked) setStockistForm(prev => ({ ...prev, products_distributed: [...prev.products_distributed, cat.name] }));
                            else setStockistForm(prev => ({ ...prev, products_distributed: prev.products_distributed.filter(p => p !== cat.name) }));
                          }}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Other Products</label>
                  <Input value={stockistForm.other_products} onChange={(e) => setStockistForm(prev => ({ ...prev, other_products: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Coverage Area</label>
                    <Input value={stockistForm.coverage_area} onChange={(e) => setStockistForm(prev => ({ ...prev, coverage_area: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Profitability</label>
                    <Select value={stockistForm.profitability} onValueChange={(val) => setStockistForm(prev => ({ ...prev, profitability: val }))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Business Hunger</label>
                  <Select value={stockistForm.business_hunger} onValueChange={(val) => setStockistForm(prev => ({ ...prev, business_hunger: val }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growth_oriented">Growth Oriented</SelectItem>
                      <SelectItem value="strategic">Strategic</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="conservative">Conservative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">About Business</label>
                  <Textarea value={stockistForm.about_business} onChange={(e) => setStockistForm(prev => ({ ...prev, about_business: e.target.value }))} rows={3} />
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddStockistModal(false)}>Cancel</Button>
              <Button onClick={handleSaveStockist}>Add Super Stockist</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View/Edit Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedDistributor ? 'Distributor Details' : 'Super Stockist Details'}</DialogTitle>
            </DialogHeader>
            
            <Tabs value={viewModalTab} onValueChange={setViewModalTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="contacts"><Users size={14} className="mr-1" />Contacts</TabsTrigger>
                <TabsTrigger value="locations"><MapPinned size={14} className="mr-1" />Locations</TabsTrigger>
                <TabsTrigger value="attachments"><Paperclip size={14} className="mr-1" />Files</TabsTrigger>
                {selectedStockist && <TabsTrigger value="distributors"><Building2 size={14} className="mr-1" />Distributors</TabsTrigger>}
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {selectedDistributor ? (
                  <DistributorDetailsTab
                    form={distributorForm}
                    setForm={setDistributorForm}
                    isEditing={isEditing}
                    superStockists={superStockists}
                    categories={categories}
                    stockistSearchTerm={stockistSearchTerm}
                    setStockistSearchTerm={setStockistSearchTerm}
                    filteredStockistsForDropdown={filteredStockistsForDropdown}
                  />
                ) : selectedStockist ? (
                  <StockistDetailsTab
                    form={stockistForm}
                    setForm={setStockistForm}
                    isEditing={isEditing}
                    categories={categories}
                  />
                ) : null}
              </TabsContent>

              <TabsContent value="contacts" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Contacts ({contacts.length})</h3>
                  <Button size="sm" onClick={() => setShowAddContact(true)}><Plus size={14} className="mr-1" />Add Contact</Button>
                </div>
                {showAddContact && (
                  <Card className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Contact Name *" value={newContact.contact_name || ''} onChange={(e) => setNewContact(prev => ({ ...prev, contact_name: e.target.value }))} />
                      <Input placeholder="Designation" value={newContact.designation || ''} onChange={(e) => setNewContact(prev => ({ ...prev, designation: e.target.value }))} />
                      <Input placeholder="Phone" value={newContact.phone || ''} onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))} />
                      <Input placeholder="Email" value={newContact.email || ''} onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))} />
                      <Input placeholder="Address" className="col-span-2" value={newContact.address || ''} onChange={(e) => setNewContact(prev => ({ ...prev, address: e.target.value }))} />
                      <div className="flex items-center gap-2">
                        <Checkbox checked={newContact.is_primary || false} onCheckedChange={(checked) => setNewContact(prev => ({ ...prev, is_primary: !!checked }))} />
                        <span className="text-sm">Primary Contact</span>
                      </div>
                      <Select value={newContact.reports_to || ''} onValueChange={(val) => setNewContact(prev => ({ ...prev, reports_to: val }))}>
                        <SelectTrigger><SelectValue placeholder="Reports To" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={handleAddContact}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddContact(false); setNewContact({}); }}>Cancel</Button>
                    </div>
                  </Card>
                )}
                <div className="space-y-2">
                  {contacts.map(contact => (
                    <Card key={contact.id} className="p-3">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{contact.contact_name}</span>
                            {contact.is_primary && <Badge variant="secondary">Primary</Badge>}
                          </div>
                          {contact.designation && <p className="text-sm text-muted-foreground">{contact.designation}</p>}
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            {contact.phone && <span className="flex items-center gap-1"><Phone size={12} />{contact.phone}</span>}
                            {contact.email && <span className="flex items-center gap-1"><Mail size={12} />{contact.email}</span>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {contacts.length === 0 && <p className="text-muted-foreground text-center py-4">No contacts added yet</p>}
                </div>
              </TabsContent>

              <TabsContent value="locations" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Locations ({locations.length})</h3>
                  <Button size="sm" onClick={() => setShowAddLocation(true)}><Plus size={14} className="mr-1" />Add Location</Button>
                </div>
                {showAddLocation && (
                  <Card className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Location Name *" value={newLocation.location_name || ''} onChange={(e) => setNewLocation(prev => ({ ...prev, location_name: e.target.value }))} />
                      <Input placeholder="Contact Phone" value={newLocation.contact_phone || ''} onChange={(e) => setNewLocation(prev => ({ ...prev, contact_phone: e.target.value }))} />
                      <Input placeholder="City" value={newLocation.city || ''} onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))} />
                      <Input placeholder="State" value={newLocation.state || ''} onChange={(e) => setNewLocation(prev => ({ ...prev, state: e.target.value }))} />
                      <Input placeholder="Pincode" value={newLocation.pincode || ''} onChange={(e) => setNewLocation(prev => ({ ...prev, pincode: e.target.value }))} />
                      <div className="flex items-center gap-2">
                        <Checkbox checked={newLocation.is_head_office || false} onCheckedChange={(checked) => setNewLocation(prev => ({ ...prev, is_head_office: !!checked }))} />
                        <span className="text-sm">Head Office</span>
                      </div>
                      <Input placeholder="Address" className="col-span-2" value={newLocation.address || ''} onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={handleAddLocation}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddLocation(false); setNewLocation({}); }}>Cancel</Button>
                    </div>
                  </Card>
                )}
                <div className="space-y-2">
                  {locations.map(loc => (
                    <Card key={loc.id} className="p-3">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{loc.location_name}</span>
                            {loc.is_head_office && <Badge variant="secondary">Head Office</Badge>}
                          </div>
                          {loc.address && <p className="text-sm text-muted-foreground">{loc.address}</p>}
                          <p className="text-sm text-muted-foreground">{[loc.city, loc.state, loc.pincode].filter(Boolean).join(', ')}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {locations.length === 0 && <p className="text-muted-foreground text-center py-4">No locations added yet</p>}
                </div>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Attachments ({attachments.length})</h3>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    <Button size="sm" asChild><span><Upload size={14} className="mr-1" />Upload File</span></Button>
                  </label>
                </div>
                <div className="space-y-2">
                  {attachments.map(att => (
                    <Card key={att.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{att.file_name}</a>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(att.created_at).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  ))}
                  {attachments.length === 0 && <p className="text-muted-foreground text-center py-4">No attachments yet</p>}
                </div>
              </TabsContent>

              {selectedStockist && (
                <TabsContent value="distributors" className="space-y-4 mt-4">
                  <h3 className="font-semibold">Mapped Distributors ({mappedDistributors.length})</h3>
                  <div className="space-y-2">
                    {mappedDistributors.map(d => (
                      <Card key={d.id} className="p-3 cursor-pointer hover:shadow-md" onClick={() => openDistributorView(d)}>
                        <div className="flex justify-between">
                          <div>
                            <span className="font-medium">{d.name}</span>
                            <p className="text-sm text-muted-foreground">{d.contact_person} • {d.phone}</p>
                          </div>
                          <Badge>{d.status}</Badge>
                        </div>
                      </Card>
                    ))}
                    {mappedDistributors.length === 0 && <p className="text-muted-foreground text-center py-4">No distributors mapped to this stockist</p>}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="destructive" 
                onClick={() => {
                  const target = selectedDistributor || selectedStockist;
                  if (target) {
                    setDeleteTarget({ type: selectedDistributor ? 'distributor' : 'stockist', id: target.id, name: target.name });
                    setShowDeleteDialog(true);
                  }
                }}
              >
                <Trash2 size={16} className="mr-2" />Delete
              </Button>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={selectedDistributor ? handleSaveDistributor : handleSaveStockist}>Save Changes</Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}><Edit size={16} className="mr-2" />Edit</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mass Edit Modal */}
        <Dialog open={showMassEditModal} onOpenChange={setShowMassEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reassign Distributors to Super Stockist</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Selected {selectedIds.length} distributor(s). Choose a super stockist to assign them to:
            </p>
            <Select value={massEditStockistId} onValueChange={setMassEditStockistId}>
              <SelectTrigger><SelectValue placeholder="Select Super Stockist" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Remove mapping)</SelectItem>
                {superStockists.map(ss => <SelectItem key={ss.id} value={ss.id}>{ss.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMassEditModal(false)}>Cancel</Button>
              <Button onClick={handleMassEditSave}>Reassign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteTarget?.type === 'distributor' ? 'Distributor' : 'Super Stockist'}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

// Sub-components for cleaner code
const DistributorDetailsTab = ({ form, setForm, isEditing, superStockists, categories, stockistSearchTerm, setStockistSearchTerm, filteredStockistsForDropdown }: any) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Company Name</label>
        {isEditing ? <Input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} /> : <p className="font-medium">{form.name}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Status</label>
        {isEditing ? (
          <Select value={form.distributor_status} onValueChange={(val) => setForm((prev: any) => ({ ...prev, distributor_status: val }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DISTRIBUTOR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : <Badge className={DISTRIBUTOR_STATUSES.find(s => s.value === form.distributor_status)?.color}>{DISTRIBUTOR_STATUSES.find(s => s.value === form.distributor_status)?.label}</Badge>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
        {isEditing ? <Input value={form.contact_person} onChange={(e) => setForm((prev: any) => ({ ...prev, contact_person: e.target.value }))} /> : <p className="font-medium">{form.contact_person}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Phone</label>
        {isEditing ? <Input value={form.phone} onChange={(e) => setForm((prev: any) => ({ ...prev, phone: e.target.value }))} /> : <p className="font-medium">{form.phone}</p>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Email</label>
        {isEditing ? <Input value={form.email} onChange={(e) => setForm((prev: any) => ({ ...prev, email: e.target.value }))} /> : <p className="font-medium">{form.email || '-'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">GST Number</label>
        {isEditing ? <Input value={form.gst_number} onChange={(e) => setForm((prev: any) => ({ ...prev, gst_number: e.target.value }))} /> : <p className="font-medium">{form.gst_number || '-'}</p>}
      </div>
    </div>
    {isEditing && (
      <div>
        <label className="text-sm font-medium">Select Super Stockist</label>
        <Select value={form.parent_id} onValueChange={(val) => setForm((prev: any) => ({ ...prev, parent_id: val }))}>
          <SelectTrigger><SelectValue placeholder="Search and select..." /></SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input placeholder="Search stockist..." value={stockistSearchTerm} onChange={(e) => setStockistSearchTerm(e.target.value)} className="mb-2" />
            </div>
            <SelectItem value="">None</SelectItem>
            {filteredStockistsForDropdown.map((ss: any) => <SelectItem key={ss.id} value={ss.id}>{ss.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )}
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Established Year</label>
        {isEditing ? <Input type="number" value={form.established_year} onChange={(e) => setForm((prev: any) => ({ ...prev, established_year: e.target.value }))} /> : <p className="font-medium">{form.established_year || '-'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Annual Revenue</label>
        {isEditing ? <Input type="number" value={form.annual_revenue} onChange={(e) => setForm((prev: any) => ({ ...prev, annual_revenue: e.target.value }))} /> : <p className="font-medium">{form.annual_revenue ? `₹${Number(form.annual_revenue).toLocaleString()}` : '-'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Sales Team</label>
        {isEditing ? <Input type="number" value={form.sales_team_size} onChange={(e) => setForm((prev: any) => ({ ...prev, sales_team_size: e.target.value }))} /> : <p className="font-medium">{form.sales_team_size || '-'}</p>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Trucks</label>
        {isEditing ? <Input type="number" value={form.assets_trucks} onChange={(e) => setForm((prev: any) => ({ ...prev, assets_trucks: e.target.value }))} /> : <p className="font-medium">{form.assets_trucks || '0'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Vans</label>
        {isEditing ? <Input type="number" value={form.assets_vans} onChange={(e) => setForm((prev: any) => ({ ...prev, assets_vans: e.target.value }))} /> : <p className="font-medium">{form.assets_vans || '0'}</p>}
      </div>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">About Business</label>
      {isEditing ? <Textarea value={form.about_business} onChange={(e) => setForm((prev: any) => ({ ...prev, about_business: e.target.value }))} /> : <p className="font-medium">{form.about_business || '-'}</p>}
    </div>
  </div>
);

const StockistDetailsTab = ({ form, setForm, isEditing, categories }: any) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Name</label>
        {isEditing ? <Input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} /> : <p className="font-medium">{form.name}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Status</label>
        {isEditing ? (
          <Select value={form.stockist_status} onValueChange={(val) => setForm((prev: any) => ({ ...prev, stockist_status: val }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DISTRIBUTOR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : <Badge className={DISTRIBUTOR_STATUSES.find(s => s.value === form.stockist_status)?.color}>{DISTRIBUTOR_STATUSES.find(s => s.value === form.stockist_status)?.label}</Badge>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
        {isEditing ? <Input value={form.contact_name} onChange={(e) => setForm((prev: any) => ({ ...prev, contact_name: e.target.value }))} /> : <p className="font-medium">{form.contact_name || '-'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Phone</label>
        {isEditing ? <Input value={form.contact_phone} onChange={(e) => setForm((prev: any) => ({ ...prev, contact_phone: e.target.value }))} /> : <p className="font-medium">{form.contact_phone || '-'}</p>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Email</label>
        {isEditing ? <Input value={form.contact_email} onChange={(e) => setForm((prev: any) => ({ ...prev, contact_email: e.target.value }))} /> : <p className="font-medium">{form.contact_email || '-'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">City / State</label>
        {isEditing ? (
          <div className="flex gap-2">
            <Input value={form.city} onChange={(e) => setForm((prev: any) => ({ ...prev, city: e.target.value }))} placeholder="City" />
            <Input value={form.state} onChange={(e) => setForm((prev: any) => ({ ...prev, state: e.target.value }))} placeholder="State" />
          </div>
        ) : <p className="font-medium">{[form.city, form.state].filter(Boolean).join(', ') || '-'}</p>}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Established Year</label>
        {isEditing ? <Input type="number" value={form.established_year} onChange={(e) => setForm((prev: any) => ({ ...prev, established_year: e.target.value }))} /> : <p className="font-medium">{form.established_year || '-'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Annual Revenue</label>
        {isEditing ? <Input type="number" value={form.annual_revenue} onChange={(e) => setForm((prev: any) => ({ ...prev, annual_revenue: e.target.value }))} /> : <p className="font-medium">{form.annual_revenue ? `₹${Number(form.annual_revenue).toLocaleString()}` : '-'}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Sales Team</label>
        {isEditing ? <Input type="number" value={form.sales_team_size} onChange={(e) => setForm((prev: any) => ({ ...prev, sales_team_size: e.target.value }))} /> : <p className="font-medium">{form.sales_team_size || '-'}</p>}
      </div>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">About Business</label>
      {isEditing ? <Textarea value={form.about_business} onChange={(e) => setForm((prev: any) => ({ ...prev, about_business: e.target.value }))} /> : <p className="font-medium">{form.about_business || '-'}</p>}
    </div>
  </div>
);

export default DistributorMapping;