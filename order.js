import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabase = null;
let orderItems = [];
let totalAmount = 0;

function generateQRCode(text) {
    return text.substring(0, 8);
}

function updateTotal() {
    totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('total-amount').textContent = `₹${totalAmount.toFixed(2)}`;
}

function renderItems() {
    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = '';

    orderItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'bg-gray-100 p-3 rounded-lg flex items-center justify-between';
        itemDiv.innerHTML = `
            <div>
                <span class="font-semibold text-gray-800">${item.name}</span>
                <span class="text-sm text-gray-500 ml-2">₹${item.price.toFixed(2)}</span>
            </div>
            <button class="remove-item text-red-500 hover:text-red-700 font-bold" data-index="${index}">&times;</button>
        `;
        itemsList.appendChild(itemDiv);
    });

    updateTotal();
}

function addItem() {
    const itemName = document.getElementById('item-name').value.trim();
    const itemPrice = parseFloat(document.getElementById('item-price').value);

    if (!itemName || !itemPrice || itemPrice <= 0) {
        document.getElementById('error-message').textContent = 'Please enter valid item name and price';
        return;
    }

    orderItems.push({ name: itemName, price: itemPrice });
    document.getElementById('item-name').value = '';
    document.getElementById('item-price').value = '';
    document.getElementById('error-message').textContent = '';

    renderItems();
}

async function placeOrder() {
    const studentName = document.getElementById('student-name').value.trim();
    const studentId = document.getElementById('student-id').value.trim();

    if (!studentName || !studentId) {
        document.getElementById('error-message').textContent = 'Please enter your name and student ID';
        return;
    }

    if (orderItems.length === 0) {
        document.getElementById('error-message').textContent = 'Please add at least one item';
        return;
    }

    try {
        const qrCode = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const { data, error } = await supabase
            .from('orders')
            .insert({
                student_name: studentName,
                student_id: studentId,
                items: orderItems,
                total_amount: totalAmount,
                qr_code: qrCode,
                order_date: new Date().toISOString().split('T')[0],
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        displayQRCode(data);
    } catch (error) {
        console.error('Error placing order:', error);
        document.getElementById('error-message').textContent = error.message || 'Failed to place order';
    }
}

function displayQRCode(order) {
    document.getElementById('order-form-container').classList.add('hidden');
    document.getElementById('qr-code-container').classList.remove('hidden');

    const qrContainer = document.getElementById('qr-code');
    qrContainer.innerHTML = '';
    QRCode.toCanvas(order.qr_code, { width: 200, margin: 2 }, (error, canvas) => {
        if (error) {
            console.error('QR generation error:', error);
            qrContainer.innerHTML = '<p class="text-red-500">Failed to generate QR code</p>';
        } else {
            qrContainer.appendChild(canvas);
        }
    });

    document.getElementById('order-id').textContent = generateQRCode(order.qr_code);
    document.getElementById('order-date').textContent = new Date(order.order_date).toLocaleDateString();

    const orderSummary = document.getElementById('order-summary');
    orderSummary.innerHTML = orderItems.map(item =>
        `<div class="flex justify-between py-1">
            <span>${item.name}</span>
            <span>₹${item.price.toFixed(2)}</span>
        </div>`
    ).join('') +
    `<div class="flex justify-between py-1 border-t border-gray-300 mt-2 pt-2 font-semibold">
        <span>Total</span>
        <span>₹${totalAmount.toFixed(2)}</span>
    </div>`;
}

function resetForm() {
    document.getElementById('order-form-container').classList.remove('hidden');
    document.getElementById('qr-code-container').classList.add('hidden');

    document.getElementById('student-name').value = '';
    document.getElementById('student-id').value = '';
    orderItems = [];
    totalAmount = 0;
    renderItems();
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

        document.getElementById('add-item').addEventListener('click', addItem);
        document.getElementById('item-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addItem();
        });
        document.getElementById('item-price').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addItem();
        });

        document.getElementById('items-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const index = parseInt(e.target.dataset.index);
                orderItems.splice(index, 1);
                renderItems();
            }
        });

        document.getElementById('place-order').addEventListener('click', placeOrder);
        document.getElementById('new-order').addEventListener('click', resetForm);

    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('error-message').textContent = 'Failed to initialize app';
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
