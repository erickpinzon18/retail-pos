import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/shared/SearchInput';

// Mock data
const mockUsers = {
  'Tienda Centro': [
    { id: '1', name: 'Ana García', role: 'Cajero', schedule: 'weekday' },
    { id: '2', name: 'Luis Martínez', role: 'Gerente', schedule: 'weekday' },
  ],
  'Tienda Plaza Mayor': [
    { id: '3', name: 'Sofía Hernández', role: 'Cajero', schedule: 'weekend' },
  ],
};

export default function ManageUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleAddUser = () => {
    setIsEditing(false);
    setShowUserModal(true);
  };

  const handleEditUser = () => {
    setIsEditing(true);
    setShowUserModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra el personal de todas tus sucursales.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={handleAddUser}>
          Agregar Usuario
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        placeholder="Buscar usuario por nombre o email..."
        value={searchTerm}
        onChange={setSearchTerm}
        className="max-w-lg"
      />

      {/* Users by Store */}
      <div className="space-y-8">
        {Object.entries(mockUsers).map(([storeName, users]) => (
          <div key={storeName}>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{storeName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {users.map((user) => (
                <Card key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={user.schedule === 'weekend' ? 'warning' : 'info'}>
                      {user.schedule === 'weekend' ? 'Fin de Semana' : 'Entre Semana'}
                    </Badge>
                    <div className="mt-2 flex items-center space-x-2 justify-end">
                      <button onClick={handleEditUser} className="text-gray-400 hover:text-indigo-600">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => setShowDeleteModal(true)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={isEditing ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}
        size="lg"
      >
        <form className="space-y-4">
          <Input label="Nombre Completo" />
          <Input label="Email" type="email" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tienda Asignada</label>
            <select className="w-full border border-gray-300 rounded-lg p-2">
              <option>Tienda Centro</option>
              <option>Tienda Plaza Mayor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select className="w-full border border-gray-300 rounded-lg p-2">
              <option>Cajero</option>
              <option>Gerente de Tienda</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Horario Principal</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input type="radio" name="horario" className="mr-2" /> Entre Semana
              </label>
              <label className="flex items-center">
                <input type="radio" name="horario" className="mr-2" /> Fin de Semana
              </label>
              <label className="flex items-center">
                <input type="radio" name="horario" className="mr-2" /> Ambos
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="md" showCloseButton={false}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Trash2 className="text-red-600" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">¿Eliminar Usuario?</h3>
          <p className="mt-2 text-sm text-gray-500">
            Esta acción es irreversible. ¿Estás seguro de que quieres eliminar a este usuario?
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger">Sí, Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
