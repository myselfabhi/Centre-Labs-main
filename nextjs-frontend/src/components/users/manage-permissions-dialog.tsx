import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, User, Permission } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ManagePermissionsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MODULES = [
  'products',
  'orders',
  'customers',
  'inventory',
  'collections',
  'categories',
  'shipping',
  'users',
  'settings',
  'analytics'
];

const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

const ACCESS_LEVELS = {
  NONE: 'No Access',
  READ: 'View Only',
  PARTIAL: 'Partial Access',
  FULL: 'Full Access'
} as const;

export function ManagePermissionsDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: ManagePermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [fetchingUser, setFetchingUser] = useState(false);

  useEffect(() => {
    async function fetchUserPermissions() {
      if (user && open) {
        try {
          setFetchingUser(true);
          const response = await api.getUser(user.id);
          
          if (response.success && response.data) {
            // Normalize backend permissions (modules are uppercase in API)
            const fetched = (response.data.permissions || []).map((p: any) => ({
              id: p.id || `${String(p.module).toLowerCase()}-${p.action}`,
              module: String(p.module).toLowerCase(),
              action: String(p.action).toUpperCase(),
              granted: Boolean(p.granted),
            }));

            // Ensure a complete matrix for all MODULES x ACTIONS
            const completeMatrix: Permission[] = MODULES.flatMap(module =>
              ACTIONS.map(action => {
                const existing = fetched.find((p: any) => p.module === module && p.action === action);
                return existing || {
                  id: `${module}-${action}`,
                  module,
                  action,
                  granted: false,
                };
              })
            );

            setPermissions(completeMatrix);
            
            // Initialize all modules as expanded
            const initialExpandedState = MODULES.reduce((acc, module) => ({
              ...acc,
              [module]: true
            }), {});
            setExpandedModules(initialExpandedState);
          }
        } catch (error) {
          console.error('Failed to fetch user permissions:', error);
          toast.error('Failed to load user permissions');
        } finally {
          setFetchingUser(false);
        }
      }
    }

    fetchUserPermissions();
  }, [user, open]);

  const handlePermissionChange = (module: string, action: string, granted: boolean) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.module === module && p.action === action);
      if (existing) {
        return prev.map(p =>
          p.module === module && p.action === action
            ? { ...p, granted }
            : p
        );
      }
      return [...prev, { id: `${module}-${action}`, module, action, granted }];
    });
  };

  const handleModuleSelectAll = (module: string, granted: boolean) => {
    setPermissions(prev => {
      return prev.map(p =>
        p.module === module ? { ...p, granted } : p
      );
    });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.updateUserPermissions(user.id, permissions);
      
      if (response.success) {
        toast.success('Permissions updated successfully');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(response.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Failed to update permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const isPermissionGranted = (module: string, action: string) => {
    return permissions.some(p => 
      p.module === module && 
      p.action === action && 
      p.granted
    );
  };

  const getModuleAccessLevel = (module: string) => {
    const modulePermissions = permissions.filter(p => p.module === module);
    const grantedCount = modulePermissions.filter(p => p.granted).length;
    
    if (grantedCount === 0) return ACCESS_LEVELS.NONE;
    if (grantedCount === ACTIONS.length) return ACCESS_LEVELS.FULL;
    if (modulePermissions.some(p => p.action === 'READ' && p.granted)) return ACCESS_LEVELS.READ;
    return ACCESS_LEVELS.PARTIAL;
  };

  const getAccessLevelBadgeVariant = (accessLevel: string) => {
    switch (accessLevel) {
      case ACCESS_LEVELS.FULL:
        return 'default';
      case ACCESS_LEVELS.PARTIAL:
        return 'secondary';
      case ACCESS_LEVELS.READ:
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const toggleModuleExpansion = (module: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Manage permissions for {user.firstName} {user.lastName}
          </DialogDescription>
        </DialogHeader>

        {fetchingUser ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading permissions...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
              {MODULES.map(module => {
                const accessLevel = getModuleAccessLevel(module);
                const isExpanded = expandedModules[module];
                
                return (
                  <Card key={module}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-8 w-8"
                            onClick={() => toggleModuleExpansion(module)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <div className="font-semibold capitalize">{module}</div>
                            <div className="text-sm text-muted-foreground">
                              Current access: <Badge variant={getAccessLevelBadgeVariant(accessLevel)}>{accessLevel}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModuleSelectAll(module, true)}
                          >
                            Grant All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModuleSelectAll(module, false)}
                          >
                            Revoke All
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 pl-12">
                          {ACTIONS.map(action => (
                            <div key={`${module}-${action}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${module}-${action}`}
                                checked={isPermissionGranted(module, action)}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(module, action, checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`${module}-${action}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {action.charAt(0) + action.slice(1).toLowerCase()}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
              >
                Save Changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 