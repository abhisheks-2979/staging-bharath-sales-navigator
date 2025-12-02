import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, BookOpen, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PriceBook {
  id: string;
  price_book_name: string;
  account_id: string | null;
  currency: string;
  is_standard: boolean;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
}

const PriceBooks = () => {
  const navigate = useNavigate();
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchPriceBooks();
  }, [activeFilter]);

  const fetchPriceBooks = async () => {
    try {
      let query = supabase
        .from('inst_price_books')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (activeFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPriceBooks(data || []);
    } catch (error) {
      console.error('Error fetching price books:', error);
      toast.error('Failed to load price books');
    } finally {
      setLoading(false);
    }
  };

  const filteredPriceBooks = priceBooks.filter(book =>
    book.price_book_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.currency?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Price Books</h1>
              <p className="text-muted-foreground text-sm">{filteredPriceBooks.length} price books</p>
            </div>
          </div>
          <Button onClick={() => toast.info('Price book creation coming soon')}>
            <Plus className="h-4 w-4 mr-2" />
            New Price Book
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search price books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              All
            </Button>
            <Button
              variant={activeFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={activeFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('inactive')}
            >
              Inactive
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredPriceBooks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No price books found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPriceBooks.map(book => (
              <Card key={book.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{book.price_book_name}</span>
                        {book.is_standard && (
                          <Badge variant="secondary">Standard</Badge>
                        )}
                        <Badge className={book.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                          {book.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">{book.currency}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {book.effective_from && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            From: {format(new Date(book.effective_from), 'dd MMM yyyy')}
                          </div>
                        )}
                        {book.effective_to && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            To: {format(new Date(book.effective_to), 'dd MMM yyyy')}
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
      </div>
    </Layout>
  );
};

export default PriceBooks;
