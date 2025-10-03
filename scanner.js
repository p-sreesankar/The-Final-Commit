import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabase = null;
let currentOrder = null;

async function scanQRCode() {
    const qrCode = document.getElementById('qr-input').value.trim();
    const errorDiv = document.getElementById('scan-error');

    if (!qrCode) {
        errorDiv.textContent = 'Please enter a QR code';
        return;
    }

    try {
        errorDiv.textContent = '';

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('qr_code', qrCode)
            .eq('order_date', new Date().toISOString().split('T')[0])
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            errorDiv.textContent = 'Order not found or QR code expired';
            return;
        }

        currentOrder = data;
        displayOrderDetails(data);

    } catch (error) {
        console.error('Error scanning QR code:', error);
        errorDiv.textContent = error.message || 'Failed to scan QR code';
    }
}

function displayOrderDetails(order) {
    document.getElementById('scanner-container').classList.add('hidden');
    document.getElementById('order-details-container').classList.remove('hidden');

    document.getElementById('detail-student-name').textContent = order.student_name;
    document.getElementById('detail-student-id').textContent = order.student_id;
    document.getElementById('detail-order-date').textContent = new Date(order.order_date).toLocaleDateString();

    const itemsContainer = document.getElementById('detail-items');
    itemsContainer.innerHTML = order.items.map(item =>
        `<div class="flex justify-between py-2 border-b border-orange-200">
            <span class="text-gray-800">${item.name}</span>
            <span class="font-semibold text-gray-800">₹${item.price.toFixed(2)}</span>
        </div>`
    ).join('');

    document.getElementById('detail-total').textContent = `₹${parseFloat(order.total_amount).toFixed(2)}`;

    const statusContainer = document.getElementById('order-status-container');
    const fulfillActions = document.getElementById('fulfill-actions');

    if (order.status === 'fulfilled') {
        statusContainer.innerHTML = `
            <div class="bg-gray-100 p-4 rounded-xl border-2 border-gray-300 mb-4">
                <div class="flex items-center justify-center mb-2">
                    <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>
                <p class="text-center font-bold text-gray-700">Order Already Fulfilled</p>
                <p class="text-center text-sm text-gray-600 mt-1">Fulfilled by: ${order.fulfilled_by || 'Staff'}</p>
                <p class="text-center text-sm text-gray-600">Time: ${new Date(order.fulfilled_at).toLocaleString()}</p>
            </div>
        `;
        fulfillActions.innerHTML = `
            <button id="back-btn" class="w-full bg-gray-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-600 transition">Scan Another</button>
        `;
        document.getElementById('back-btn').addEventListener('click', resetScanner);
    } else {
        statusContainer.innerHTML = `
            <div class="bg-green-50 p-4 rounded-xl border-2 border-green-200 mb-4">
                <div class="flex items-center justify-center mb-2">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <p class="text-center font-bold text-green-700">Ready to Fulfill</p>
                <p class="text-center text-sm text-gray-600 mt-1">This order is pending and can be fulfilled now</p>
            </div>
        `;
        fulfillActions.innerHTML = `
            <button id="fulfill-btn" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-300 shadow-lg">Fulfill Order</button>
            <button id="back-btn" class="w-full bg-gray-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-600 transition">Scan Another</button>
        `;
        document.getElementById('fulfill-btn').addEventListener('click', fulfillOrder);
        document.getElementById('back-btn').addEventListener('click', resetScanner);
    }
}

async function fulfillOrder() {
    if (!currentOrder) return;

    const staffName = prompt('Enter your name:');
    if (!staffName) return;

    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'fulfilled',
                fulfilled_at: new Date().toISOString(),
                fulfilled_by: staffName
            })
            .eq('id', currentOrder.id);

        if (error) throw error;

        alert('Order fulfilled successfully!');
        currentOrder.status = 'fulfilled';
        currentOrder.fulfilled_by = staffName;
        currentOrder.fulfilled_at = new Date().toISOString();
        displayOrderDetails(currentOrder);

    } catch (error) {
        console.error('Error fulfilling order:', error);
        alert('Failed to fulfill order: ' + error.message);
    }
}

function resetScanner() {
    document.getElementById('scanner-container').classList.remove('hidden');
    document.getElementById('order-details-container').classList.add('hidden');
    document.getElementById('qr-input').value = '';
    document.getElementById('scan-error').textContent = '';
    currentOrder = null;
}

async function initializeApp() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error('Failed to fetch config');
        }
        const config = await response.json();

        if (!config.url || !config.anonKey) {
            throw new Error('Supabase configuration is missing');
        }

        supabase = createClient(config.url, config.anonKey);

        document.getElementById('scan-btn').addEventListener('click', scanQRCode);
        document.getElementById('qr-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') scanQRCode();
        });

    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('scan-error').textContent = 'Failed to initialize app';
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
