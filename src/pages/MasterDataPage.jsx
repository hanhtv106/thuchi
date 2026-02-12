import { useState } from 'react';
import { useTransactions } from '../context/TransactionContext';
import DataManagementTable from '../components/common/DataManagementTable';
import './MasterDataPage.css';

const MasterDataPage = () => {
    const {
        categories, addCategory, updateCategory, deleteCategory,
        units, addUnit, updateUnit, deleteUnit,
        partners, addPartner, updatePartner, deletePartner
    } = useTransactions();

    const [activeTab, setActiveTab] = useState('categories');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'categories':
                return (
                    <DataManagementTable
                        title="Quản lý Hạng mục"
                        data={categories}
                        onAdd={addCategory}
                        onUpdate={updateCategory}
                        onDelete={deleteCategory}
                        columns={[
                            { key: 'name', label: 'Tên hạng mục' },
                            {
                                key: 'type',
                                label: 'Loại',
                                type: 'select',
                                options: [
                                    { value: 'income', label: 'Thu' },
                                    { value: 'expense', label: 'Chi' }
                                ]
                            }
                        ]}
                    />
                );
            case 'units':
                return (
                    <DataManagementTable
                        title="Quản lý Đơn vị tính"
                        data={units}
                        onAdd={addUnit}
                        onUpdate={updateUnit}
                        onDelete={deleteUnit}
                        columns={[
                            { key: 'name', label: 'Tên đơn vị' }
                        ]}
                    />
                );
            case 'partners':
                return (
                    <DataManagementTable
                        title="Quản lý Đối tác"
                        data={partners}
                        onAdd={addPartner}
                        onUpdate={updatePartner}
                        onDelete={deletePartner}
                        columns={[
                            { key: 'name', label: 'Tên đối tác' },
                            {
                                key: 'type',
                                label: 'Loại',
                                type: 'select',
                                options: [
                                    { value: 'customer', label: 'Khách hàng' },
                                    { value: 'supplier', label: 'Nhà cung cấp' },
                                    { value: 'both', label: 'Cả hai (Khách + NCC)' }
                                ]
                            },
                            { key: 'phone', label: 'Số điện thoại' },
                            { key: 'address', label: 'Địa chỉ' }
                        ]}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="master-data-page">
            <div className="page-header">
                <h1 className="page-title">Quản lý dữ liệu hệ thống</h1>
            </div>

            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    Hạng mục
                </button>
                <button
                    className={`tab-btn ${activeTab === 'units' ? 'active' : ''}`}
                    onClick={() => setActiveTab('units')}
                >
                    Đơn vị tính
                </button>
                <button
                    className={`tab-btn ${activeTab === 'partners' ? 'active' : ''}`}
                    onClick={() => setActiveTab('partners')}
                >
                    Đối tác
                </button>
            </div>

            {renderTabContent()}
        </div>
    );
};

export default MasterDataPage;
