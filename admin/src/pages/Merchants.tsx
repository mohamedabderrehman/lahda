import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createMerchant,
  createMerchantProduct,
  createMerchantProductCategory,
  deleteMerchant,
  deleteMerchantProductCategory,
  deleteProductAdmin,
  getMerchantProductCategories,
  getMerchantProducts,
  getMerchants,
  setMerchantApproved,
  updateMerchantProductCategory,
  updateMerchant,
  updateProductAdmin,
} from '../api/client';

type MerchantItem = {
  id: string;
  storeName: string;
  storeSlug: string;
  isApproved: boolean;
  isOpen: boolean;
  deliveryFee?: number | string | null;
  estimatedDeliveryMin?: number | null;
  estimatedDeliveryMax?: number | null;
  discountLabel?: string | null;
  ratingAvg?: number | null;
  hasOffers?: boolean;
  user?: { email: string; fullName: string };
};

type ProductItem = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  productCategoryId?: string | null;
  productCategory?: { id: string; nameAr: string; nameEn?: string | null } | null;
};

type ProductCategoryItem = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function Merchants() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MerchantItem | null>(null);
  const [productsMerchantId, setProductsMerchantId] = useState<string | null>(null);
  const [productsMerchantName, setProductsMerchantName] = useState<string>('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-merchants', page],
    queryFn: () => getMerchants(page, 15),
  });

  const productsQuery = useQuery({
    queryKey: ['admin-merchant-products', productsMerchantId],
    queryFn: () => getMerchantProducts(productsMerchantId as string),
    enabled: !!productsMerchantId,
  });
  const productCategoriesQuery = useQuery({
    queryKey: ['admin-merchant-product-categories', productsMerchantId],
    queryFn: () => getMerchantProductCategories(productsMerchantId as string),
    enabled: !!productsMerchantId,
  });

  const approve = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => setMerchantApproved(id, approved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchants'] }),
  });
  const create = useMutation({
    mutationFn: createMerchant,
    onSuccess: () => {
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateMerchant>[1] }) => updateMerchant(id, payload),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
  const deleteMerchantMutation = useMutation({
    mutationFn: (id: string) => deleteMerchant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchants'] }),
  });
  const createProduct = useMutation({
    mutationFn: ({ merchantId, payload }: { merchantId: string; payload: Parameters<typeof createMerchantProduct>[1] }) =>
      createMerchantProduct(merchantId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchant-products', productsMerchantId] }),
  });
  const updateProduct = useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: Parameters<typeof updateProductAdmin>[1] }) =>
      updateProductAdmin(productId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchant-products', productsMerchantId] }),
  });
  const removeProduct = useMutation({
    mutationFn: deleteProductAdmin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchant-products', productsMerchantId] }),
  });
  const createProductCategory = useMutation({
    mutationFn: ({ merchantId, payload }: { merchantId: string; payload: Parameters<typeof createMerchantProductCategory>[1] }) =>
      createMerchantProductCategory(merchantId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchant-product-categories', productsMerchantId] }),
  });
  const updateProductCategory = useMutation({
    mutationFn: ({ categoryId, payload }: { categoryId: string; payload: Parameters<typeof updateMerchantProductCategory>[1] }) =>
      updateMerchantProductCategory(categoryId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchant-product-categories', productsMerchantId] }),
  });
  const removeProductCategory = useMutation({
    mutationFn: deleteMerchantProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-product-categories', productsMerchantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-products', productsMerchantId] });
    },
  });

  if (isLoading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{String(error)}</div>;

  const items = (data?.items ?? []) as MerchantItem[];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
        <button type="button" onClick={() => setShowCreate((s) => !s)} className="btn-primary">
          {showCreate ? 'Close' : 'Add Merchant'}
        </button>
      </div>

      {showCreate && (
        <MerchantCreateForm
          loading={create.isPending}
          error={create.isError ? String(create.error) : null}
          onSubmit={(payload) => create.mutate(payload)}
        />
      )}

      {editing && (
        <MerchantEditForm
          merchant={editing}
          loading={update.isPending}
          error={update.isError ? String(update.error) : null}
          onCancel={() => setEditing(null)}
          onSubmit={(payload) => update.mutate({ id: editing.id, payload })}
        />
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Store</th>
                <th className="table-th">Owner</th>
                <th className="table-th">Info Card</th>
                <th className="table-th">Approved</th>
                <th className="table-th">Open</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{m.storeName}</td>
                  <td className="table-td text-gray-500">{m.user?.fullName ?? m.storeSlug}</td>
                  <td className="table-td text-gray-500">
                    <div>Fee: {m.deliveryFee ?? '-'}</div>
                    <div>Time: {m.estimatedDeliveryMin ?? '-'} - {m.estimatedDeliveryMax ?? '-'}</div>
                    <div>Rating: {m.ratingAvg ?? 0}</div>
                    <div>Discount: {m.discountLabel ?? '-'}</div>
                  </td>
                  <td className="table-td">
                    <span className={m.isApproved ? 'text-emerald-600' : 'text-amber-600'}>{m.isApproved ? 'Yes' : 'No'}</span>
                  </td>
                  <td className="table-td">{m.isOpen ? 'Yes' : 'No'}</td>
                  <td className="table-td">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => approve.mutate({ id: m.id, approved: !m.isApproved })}
                        disabled={approve.isPending}
                        className="text-sm font-medium text-emerald-600"
                      >
                        {m.isApproved ? 'Revoke' : 'Approve'}
                      </button>
                      <button type="button" onClick={() => setEditing(m)} className="text-sm font-medium text-primary-600">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProductsMerchantId(m.id);
                          setProductsMerchantName(m.storeName);
                        }}
                        className="text-sm font-medium text-indigo-600"
                      >
                        Products
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete merchant "${m.storeName}"? This will also delete all products and categories. This action cannot be undone.`)) {
                            deleteMerchantMutation.mutate(m.id);
                          }
                        }}
                        disabled={deleteMerchantMutation.isPending}
                        className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex justify-between">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-ghost" disabled={page <= 1}>Previous</button>
              <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} className="btn-ghost" disabled={page >= pages}>Next</button>
            </div>
          </div>
        )}
      </div>

      {productsMerchantId && (
        <MerchantProductsPanel
          storeName={productsMerchantName}
          products={(productsQuery.data ?? []) as ProductItem[]}
          categories={(productCategoriesQuery.data ?? []) as ProductCategoryItem[]}
          loading={productsQuery.isLoading}
          categoriesLoading={productCategoriesQuery.isLoading}
          error={productsQuery.isError ? String(productsQuery.error) : (productCategoriesQuery.isError ? String(productCategoriesQuery.error) : null)}
          onClose={() => setProductsMerchantId(null)}
          onCreate={(payload) => createProduct.mutate({ merchantId: productsMerchantId, payload })}
          onUpdate={(productId, payload) => updateProduct.mutate({ productId, payload })}
          onDelete={(productId) => removeProduct.mutate(productId)}
          onCreateCategory={(payload) => createProductCategory.mutate({ merchantId: productsMerchantId, payload })}
          onUpdateCategory={(categoryId, payload) => updateProductCategory.mutate({ categoryId, payload })}
          onDeleteCategory={(categoryId) => removeProductCategory.mutate(categoryId)}
        />
      )}
    </div>
  );
}

function MerchantCreateForm({
  loading,
  error,
  onSubmit,
}: {
  loading: boolean;
  error: string | null;
  onSubmit: (payload: Parameters<typeof createMerchant>[0]) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [estimatedDeliveryMin, setEstimatedDeliveryMin] = useState(20);
  const [estimatedDeliveryMax, setEstimatedDeliveryMax] = useState(35);
  const [ratingAvg, setRatingAvg] = useState(4.5);
  const [discountLabel, setDiscountLabel] = useState('');
  const [hasOffers, setHasOffers] = useState(false);

  return (
    <form
      className="card p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          email,
          password,
          fullName,
          storeName,
          storeSlug,
          deliveryFee,
          estimatedDeliveryMin,
          estimatedDeliveryMax,
          ratingAvg,
          ratingCount: 100,
          discountLabel: discountLabel || undefined,
          hasOffers,
          isApproved: true,
          isOpen: true,
        });
      }}
    >
      <h2 className="text-lg font-semibold">Create merchant</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="input" placeholder="Owner full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className="input" placeholder="Owner email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="input" placeholder="Store name" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
        <input className="input" placeholder="Store slug" value={storeSlug} onChange={(e) => setStoreSlug(e.target.value)} required />
        <input className="input" placeholder="Delivery fee" type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value || 0))} />
        <input className="input" placeholder="Time min" type="number" value={estimatedDeliveryMin} onChange={(e) => setEstimatedDeliveryMin(Number(e.target.value || 0))} />
        <input className="input" placeholder="Time max" type="number" value={estimatedDeliveryMax} onChange={(e) => setEstimatedDeliveryMax(Number(e.target.value || 0))} />
        <input className="input" placeholder="Rating avg" type="number" step="0.1" value={ratingAvg} onChange={(e) => setRatingAvg(Number(e.target.value || 0))} />
        <input className="input md:col-span-2" placeholder="Discount label (e.g. خصم 20%)" value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={hasOffers} onChange={(e) => setHasOffers(e.target.checked)} /> Has offers</label>
      </div>
      <button className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Merchant'}</button>
    </form>
  );
}

function MerchantEditForm({
  merchant,
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  merchant: MerchantItem;
  loading: boolean;
  error: string | null;
  onSubmit: (payload: Parameters<typeof updateMerchant>[1]) => void;
  onCancel: () => void;
}) {
  const [storeName, setStoreName] = useState(merchant.storeName);
  const [deliveryFee, setDeliveryFee] = useState(Number(merchant.deliveryFee ?? 0));
  const [estimatedDeliveryMin, setEstimatedDeliveryMin] = useState(Number(merchant.estimatedDeliveryMin ?? 20));
  const [estimatedDeliveryMax, setEstimatedDeliveryMax] = useState(Number(merchant.estimatedDeliveryMax ?? 35));
  const [ratingAvg, setRatingAvg] = useState(Number(merchant.ratingAvg ?? 0));
  const [discountLabel, setDiscountLabel] = useState(merchant.discountLabel ?? '');
  const [hasOffers, setHasOffers] = useState(Boolean(merchant.hasOffers));
  const [isOpen, setIsOpen] = useState(Boolean(merchant.isOpen));
  const [isApproved, setIsApproved] = useState(Boolean(merchant.isApproved));

  return (
    <form
      className="card p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          storeName,
          deliveryFee,
          estimatedDeliveryMin,
          estimatedDeliveryMax,
          ratingAvg,
          discountLabel: discountLabel || undefined,
          hasOffers,
          isOpen,
          isApproved,
        });
      }}
    >
      <h2 className="text-lg font-semibold">Edit merchant: {merchant.storeName}</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        <input className="input" type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value || 0))} />
        <input className="input" type="number" value={estimatedDeliveryMin} onChange={(e) => setEstimatedDeliveryMin(Number(e.target.value || 0))} />
        <input className="input" type="number" value={estimatedDeliveryMax} onChange={(e) => setEstimatedDeliveryMax(Number(e.target.value || 0))} />
        <input className="input" type="number" step="0.1" value={ratingAvg} onChange={(e) => setRatingAvg(Number(e.target.value || 0))} />
        <input className="input" value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} placeholder="Discount label" />
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={hasOffers} onChange={(e) => setHasOffers(e.target.checked)} /> Has offers</label>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} /> Open</label>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={isApproved} onChange={(e) => setIsApproved(e.target.checked)} /> Approved</label>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function MerchantProductsPanel({
  storeName,
  products,
  categories,
  loading,
  categoriesLoading,
  error,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: {
  storeName: string;
  products: ProductItem[];
  categories: ProductCategoryItem[];
  loading: boolean;
  categoriesLoading: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (payload: Parameters<typeof createMerchantProduct>[1]) => void;
  onUpdate: (productId: string, payload: Parameters<typeof updateProductAdmin>[1]) => void;
  onDelete: (productId: string) => void;
  onCreateCategory: (payload: Parameters<typeof createMerchantProductCategory>[1]) => void;
  onUpdateCategory: (categoryId: string, payload: Parameters<typeof updateMerchantProductCategory>[1]) => void;
  onDeleteCategory: (categoryId: string) => void;
}) {
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [productCategoryId, setProductCategoryId] = useState<string>('');
  const [categoryNameAr, setCategoryNameAr] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const grouped = products.reduce<Record<string, ProductItem[]>>((acc, p) => {
    const key = p.productCategoryId || 'uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const categoryName = (id: string) => {
    if (id === 'uncategorized') return 'منتجات أخرى';
    const found = categories.find((c) => c.id === id);
    return found?.nameAr || 'منتجات أخرى';
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Products — {storeName}</h2>
        <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="border border-gray-100 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Product Categories</h3>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!categoryNameAr.trim()) return;
            onCreateCategory({ nameAr: categoryNameAr.trim() });
            setCategoryNameAr('');
          }}
        >
          <input className="input" placeholder="اسم التصنيف (مثال: التشوروز واللقمة)" value={categoryNameAr} onChange={(e) => setCategoryNameAr(e.target.value)} />
          <button className="btn-primary">Add Category</button>
        </form>
        {categoriesLoading ? (
          <div className="text-gray-500 text-sm">Loading categories...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <div key={c.id} className="px-3 py-1.5 rounded-full bg-gray-100 text-sm flex items-center gap-2">
                {editingCategoryId === c.id ? (
                  <>
                    <input
                      className="input h-8 w-40 text-sm"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="text-xs text-primary-600"
                      onClick={() => {
                        onUpdateCategory(c.id, { nameAr: editingCategoryName.trim() || c.nameAr });
                        setEditingCategoryId(null);
                      }}
                    >
                      Save
                    </button>
                    <button type="button" className="text-xs text-gray-500" onClick={() => setEditingCategoryId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span>{c.nameAr}</span>
                    <button type="button" className="text-xs text-primary-600" onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.nameAr); }}>Edit</button>
                    <button type="button" className="text-xs text-red-600" onClick={() => onDeleteCategory(c.id)}>Delete</button>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && <div className="text-sm text-gray-500">No categories yet.</div>}
          </div>
        )}
      </div>

      <form
        className="grid grid-cols-1 md:grid-cols-4 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameAr.trim()) return;
          onCreate({ nameAr, description: description || undefined, price, productCategoryId: productCategoryId || undefined });
          setNameAr('');
          setDescription('');
          setPrice(0);
        }}
      >
        <input className="input" placeholder="Product name (AR)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        <input className="input" placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="input" value={productCategoryId} onChange={(e) => setProductCategoryId(e.target.value)}>
          <option value="">بدون تصنيف</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.nameAr}</option>
          ))}
        </select>
        <input className="input" type="number" placeholder="Price" value={price} onChange={(e) => setPrice(Number(e.target.value || 0))} />
        <button className="btn-primary">Add</button>
      </form>
      {loading ? (
        <div className="text-gray-500">Loading products...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([catId, list]) => (
            <div key={catId} className="border border-gray-100 rounded-lg p-3">
              <h3 className="font-semibold mb-2">{categoryName(catId)}</h3>
              <div className="space-y-2">
                {list.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <div>
                      <div className="font-medium">{p.nameAr}</div>
                      {p.description ? <div className="text-xs text-gray-500">{p.description}</div> : null}
                      <div className="text-xs text-gray-500">{p.price}</div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="text-sm text-primary-600" onClick={() => onUpdate(p.id, { isAvailable: !p.isAvailable })}>
                        {p.isAvailable ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="text-sm text-red-600" onClick={() => onDelete(p.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="text-sm text-gray-500">No products yet.</div>}
        </div>
      )}
    </div>
  );
}
