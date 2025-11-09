// Global variables
let globalData = null;
let priceChart = null;
let worldGoldChart = null;
let domesticGoldChart = null;
let monthlySummaryChart = null;
let currentViewType = 'current';
let selectedGoldType = null;
let selectedDomesticGoldType = null;
let showingRange = false;
let selectedMonth = null;

// Format currency in VND
function formatVND(amount) {
	return new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
		minimumFractionDigits: 0
	}).format(amount);
}

// Format currency in USD
function formatUSD(amount) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2
	}).format(amount);
}

// Format number with thousand separators
function formatNumber(num) {
	return new Intl.NumberFormat('vi-VN').format(num);
}

// Calculate percentage change
function calculateChange(oldValue, newValue) {
	if (!oldValue || oldValue === 0) return 0;
	return ((newValue - oldValue) / oldValue * 100).toFixed(2);
}

// Get trend class based on change
function getTrendClass(change) {
	if (change > 0) return 'trend-up';
	if (change < 0) return 'trend-down';
	return 'trend-neutral';
}

// Get price class based on change
function getPriceClass(change) {
	if (change > 0) return 'price-up';
	if (change < 0) return 'price-down';
	return 'price-neutral';
}

// Load data from API
async function loadData() {
	try {
		const response = await fetch('/api/data');
		if (!response.ok) {
			throw new Error('Failed to load data');
		}

		globalData = await response.json();

		// Update UI
		updateLastUpdateTime();
		displayCurrentPrices();
		populateGoldTypeButtons();
		updateChart();
		displayWorldGoldPrice();
		if (typeof displayDomesticGoldCharts === 'function') displayDomesticGoldCharts();
		displayComparison();
		displayTrendAnalysis();
		displayMonthlySummary();

		// Set date limits
		setDateLimits();

	} catch (error) {
		console.error('Error loading data:', error);
		showError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
	}
}

// Update last update time
function updateLastUpdateTime() {
	const updateElement = document.getElementById('lastUpdate');
	if (globalData && globalData.last_updated) {
		const date = new Date(globalData.last_updated);
		updateElement.textContent = `Cập nhật lần cuối: ${date.toLocaleString('vi-VN')}`;
	}
}

// Display current prices in table
function displayCurrentPrices() {
	const section = document.querySelector('.section:has(#currentPrices)');
	const tbody = document.getElementById('pricesTableBody');

	// Hide table for monthly view
	if (globalData && globalData.view_type === 'monthly') {
		document.getElementById('currentPricesSection').style.display = 'none';
		return;
	} else {
		document.getElementById('currentPricesSection').style.display = 'block';
	}

	if (!globalData || !globalData.current_prices || globalData.current_prices.length === 0) {
		tbody.innerHTML = '<tr><td colspan="4" class="loading">Không có dữ liệu</td></tr>';
		return;
	}

	tbody.innerHTML = '';

	// Update table header based on view type
	const headerRow = document.querySelector('#currentPrices thead tr');
	if (globalData.view_type === 'current') {
		headerRow.innerHTML = `
            <th>Loại vàng</th>
            <th>Giá mua TB</th>
            <th>Giá bán TB</th>
            <th>Cao nhất</th>
            <th>Thấp nhất</th>
        `;
	} else {
		headerRow.innerHTML = `
            <th>Loại vàng</th>
            <th>Mua vào</th>
            <th>Bán ra</th>
            <th>Chênh lệch</th>
        `;
	}

	globalData.current_prices.forEach(item => {
		const row = document.createElement('tr');

		if (globalData.view_type === 'current') {
			// Use USD formatting for world gold prices in current view (monthly summary)
			const isWorldGold = item.type === 'Giá vàng thế giới';
			const buyPrice = isWorldGold ? formatUSD(item.buy) : formatVND(item.buy * 1000000);
			const sellPrice = isWorldGold ? formatUSD(item.sell) : formatVND(item.sell * 1000000);

			row.innerHTML = `
                <td><strong>${item.type}</strong></td>
                <td>${buyPrice}</td>
                <td>${sellPrice}</td>
                <td class="price-up">${item.change_sell}</td>
                <td class="price-down">${item.change_buy}</td>
            `;
		} else {
			// Parse change value to determine color
			const changeValue = item.change_sell;
			let changeClass = 'price-neutral';

			if (changeValue.includes('+')) {
				changeClass = 'price-up';
			} else if (changeValue.includes('-')) {
				changeClass = 'price-down';
			} else if (changeValue === '0K' || changeValue === '0.0$') {
				changeClass = 'price-neutral';
			}

			// Use USD formatting for world gold prices
			const isWorldGold = item.type === 'Giá vàng thế giới';
			const buyPrice = isWorldGold ? formatUSD(item.buy) : formatVND(item.buy * 1000000);
			const sellPrice = isWorldGold ? formatUSD(item.sell) : formatVND(item.sell * 1000000);

			row.innerHTML = `
                <td><strong>${item.type}</strong></td>
                <td>${buyPrice}</td>
                <td>${sellPrice}</td>
                <td class="${changeClass}">${item.change_sell}</td>
            `;
		}

		tbody.appendChild(row);
	});
}

// Populate gold type buttons
function populateGoldTypeButtons() {
	const container = document.getElementById('goldTypeButtons');

	if (!globalData) {
		container.innerHTML = '<div class="loading">Không có dữ liệu</div>';
		return;
	}

	// For daily/current view, don't show gold type buttons (show all types in chart)
	if (globalData.view_type === 'daily' || globalData.view_type === 'current') {
		container.innerHTML = '<p>So sánh giá giữa các loại vàng</p>';
		return;
	}

	// For monthly view, show gold type selection buttons
	if (!globalData.chart_data) {
		container.innerHTML = '<div class="loading">Không có dữ liệu</div>';
		return;
	}

	container.innerHTML = '';

	const goldTypes = Object.keys(globalData.chart_data).filter(type => type !== 'Giá vàng thế giới');

	goldTypes.forEach((type, index) => {
		const button = document.createElement('button');
		button.className = 'gold-type-btn';
		button.textContent = type;
		button.onclick = () => selectGoldType(type);

		if (index === 0 && !selectedGoldType) {
			button.classList.add('active');
			selectedGoldType = type;
		} else if (selectedGoldType === type) {
			button.classList.add('active');
		}

		container.appendChild(button);
	});
}

// Select gold type
function selectGoldType(type) {
	selectedGoldType = type;

	// Update button states
	document.querySelectorAll('.gold-type-btn').forEach(btn => {
		btn.classList.remove('active');
		if (btn.textContent === type) {
			btn.classList.add('active');
		}
	});

	updateChart();
}

// Update chart with selected gold type
function updateChart() {
	// Destroy existing chart if it exists
	if (priceChart) {
		priceChart.destroy();
		priceChart = null;
	}

	if (!globalData) return;

	const ctx = document.getElementById('priceChart').getContext('2d');

	if (globalData.view_type === 'daily' || globalData.view_type === 'current') {
		// For daily/current view: show comparison between gold types (exclude world gold)
		if (!globalData.current_prices || globalData.current_prices.length === 0) return;

		const filteredPrices = globalData.current_prices.filter(item => item.type !== 'Giá vàng thế giới');
		const labels = filteredPrices.map(item => item.type);
		const buyPrices = filteredPrices.map(item => item.buy);
		const sellPrices = filteredPrices.map(item => item.sell);

		priceChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'Giá mua',
						data: buyPrices,
						backgroundColor: 'rgba(34, 197, 94, 0.8)',
						borderColor: '#22c55e',
						borderWidth: 1
					},
					{
						label: 'Giá bán',
						data: sellPrices,
						backgroundColor: 'rgba(239, 68, 68, 0.8)',
						borderColor: '#ef4444',
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: 'top'
					},
					tooltip: {
						mode: 'index',
						intersect: false,
						callbacks: {
							label: function (context) {
								const value = formatVND(context.parsed.y * 1000000);
								return context.dataset.label + ': ' + value;
							}
						}
					}
				},
				scales: {
					x: {
						ticks: {
							maxRotation: 45,
							minRotation: 45
						}
					},
					y: {
						ticks: {
							stepSize: 50,
							callback: function (value) {
								return formatNumber(value);
							}
						}
					}
				}
			}
		});

	} else {
		// For monthly view: show time series for selected gold type
		if (!selectedGoldType || !globalData.chart_data[selectedGoldType]) {
			return;
		}

		const data = globalData.chart_data[selectedGoldType];

		const labels = data.map(item => {
			const date = new Date(item.date);
			return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
		});

		const buyPrices = data.map(item => item.buy);
		const sellPrices = data.map(item => item.sell);

		priceChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'Giá mua',
						data: buyPrices,
						borderColor: '#22c55e',
						backgroundColor: 'rgba(34, 197, 94, 0.1)',
						tension: 0.4,
						fill: true
					},
					{
						label: 'Giá bán',
						data: sellPrices,
						borderColor: '#ef4444',
						backgroundColor: 'rgba(239, 68, 68, 0.1)',
						tension: 0.4,
						fill: true
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: 'top'
					},
					tooltip: {
						mode: 'index',
						intersect: false,
						callbacks: {
							label: function (context) {
								return context.dataset.label + ': ' + formatVND(context.parsed.y * 1000000);
							}
						}
					}
				},
				scales: {
					y: {
						ticks: {
							callback: function (value) {
								return formatNumber(value);
							}
						}
					}
				}
			}
		});
	}
}

// Display comparison section
function displayComparison() {
	const grid = document.getElementById('comparisonGrid');

	if (!globalData || !globalData.current_prices || globalData.current_prices.length === 0) {
		grid.innerHTML = '<div class="loading">Không có dữ liệu so sánh</div>';
		return;
	}

	grid.innerHTML = '';

	globalData.current_prices.forEach(item => {
		const card = document.createElement('div');
		card.className = 'comparison-card';

		const spread = ((item.sell - item.buy) / item.buy * 100).toFixed(2);
		const spreadClass = spread > 0 ? 'text-success' : spread < 0 ? 'text-danger' : 'text-muted';

		card.innerHTML = `
            <h3>${item.type}</h3>
            <div class="comparison-item">
                <div class="comparison-label">Mua:<br>${item.type === 'Giá vàng thế giới' ? formatUSD(item.buy) : item.buy}</div>
                <div class="comparison-label">Bán:<br>${item.type === 'Giá vàng thế giới' ? formatUSD(item.sell) : item.sell}</div>
                <div class="comparison-value ${spreadClass}">Chênh lệch:<br>${spread}%</div>
            </div>
        `;

		grid.appendChild(card);
	});
}

// Display trend analysis
function displayTrendAnalysis() {
	const grid = document.getElementById('trendGrid');

	if (!globalData || !globalData.current_prices) {
		grid.innerHTML = '<div class="loading">Không có dữ liệu xu hướng</div>';
		return;
	}

	grid.innerHTML = '';

	globalData.current_prices.forEach(item => {
		if (!item.sell) return;

		const historical = globalData.chart_data ? globalData.chart_data[item.type] : null;

		let dailyChange = 0;
		let weeklyChange = 0;

		if (historical && historical.length >= 2) {
			// Calculate changes
			const latest = historical[historical.length - 1];
			const yesterday = historical[historical.length - 2] || latest;
			const weekAgo = historical[Math.max(0, historical.length - 7)] || latest;

			dailyChange = calculateChange(yesterday.sell, latest.sell);
			weeklyChange = calculateChange(weekAgo.sell, latest.sell);
		}

		const card = document.createElement('div');
		card.className = 'trend-card';

		const isWorldGold = item.type === 'Giá vàng thế giới';
		const priceDisplay = isWorldGold ? formatUSD(item.sell) : formatVND(item.sell * 1000000);

		card.innerHTML = `
            <h3>${item.type}</h3>
            <div class="trend-value">${priceDisplay}</div>
            <div>
                <span class="trend-change ${getTrendClass(dailyChange)}">
                    ${dailyChange > 0 ? '↑' : dailyChange < 0 ? '↓' : '→'} ${Math.abs(dailyChange)}% (1 ngày)
                </span>
            </div>
            <div class="mt-2">
                <span class="trend-change ${getTrendClass(weeklyChange)}">
                    ${weeklyChange > 0 ? '↑' : weeklyChange < 0 ? '↓' : '→'} ${Math.abs(weeklyChange)}% (7 ngày)
                </span>
            </div>
        `;

		grid.appendChild(card);
	});
}

// Display statistics
function displayStatistics() {
	const statisticsSection = document.getElementById('statisticsSection');

	// Hide statistics for daily view
	if (globalData && globalData.view_type === 'daily') {
		statisticsSection.style.display = 'none';
		return;
	}

	// Show statistics for current and monthly views
	statisticsSection.style.display = 'block';

	if (!globalData || !globalData.statistics) {
		return;
	}

	// Update title and labels based on view type
	const titleElement = document.getElementById('statisticsTitle');
	const highLabel = document.getElementById('highLabel');
	const lowLabel = document.getElementById('lowLabel');

	if (globalData.view_type === 'monthly') {
		titleElement.innerHTML = '📊 Biến động giá';
		highLabel.textContent = 'Cao nhất tháng';
		lowLabel.textContent = 'Thấp nhất tháng';
	} else {
		// Current view - show current month summary
		const currentMonth = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
		titleElement.innerHTML = `📊 Biến động giá ${currentMonth}`;
		highLabel.textContent = 'Cao nhất tháng';
		lowLabel.textContent = 'Thấp nhất tháng';
	}

	// Get first gold type's statistics
	const firstType = Object.keys(globalData.statistics)[0];
	const stats = globalData.statistics[firstType];

	if (!stats) return;

	// Update DOM with pre-calculated statistics
	// Check if first type is world gold for proper currency formatting
	const isWorldGold = firstType === 'Giá vàng thế giới';

	document.getElementById('highestPrice').textContent = isWorldGold ? formatUSD(stats.high) : formatVND(stats.high * 1000000);
	document.getElementById('lowestPrice').textContent = isWorldGold ? formatUSD(stats.low) : formatVND(stats.low * 1000000);
	document.getElementById('avgPrice').textContent = isWorldGold ? formatUSD(stats.avg) : formatVND(stats.avg * 1000000);
	document.getElementById('volatility').textContent = isWorldGold ? formatUSD(stats.volatility) : formatVND(stats.volatility * 1000000);
}

// Show error message
function showError(message) {
	const tbody = document.getElementById('pricesTableBody');
	tbody.innerHTML = `<tr><td colspan="4" class="loading" style="color: #ef4444;">${message}</td></tr>`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
	loadData();

	// Auto-refresh every 5 minutes
	setInterval(loadData, 5 * 60 * 1000);
});

// Change view type
function changeViewType(viewType) {
	currentViewType = viewType;

	// Update button states
	document.querySelectorAll('.view-type-btn').forEach(btn => {
		btn.classList.remove('active');
	});
	event.target.classList.add('active');

	// Hide all date selections
	document.getElementById('dateSelection').style.display = 'none';
	document.getElementById('monthSelection').style.display = 'none';

	// Show appropriate date selection and load current data
	if (viewType === 'daily') {
		document.getElementById('dateSelection').style.display = 'flex';
		updateChartTitle('Dữ liệu theo ngày');

		// Set today's date and load data
		const today = new Date().toISOString().split('T')[0];
		document.getElementById('selectedDate').value = today;
		loadDataForDate();

	} else if (viewType === 'monthly') {
		document.getElementById('monthSelection').style.display = 'flex';
		updateChartTitle('Tóm tắt theo tháng');

		// Set current month and load data
		const currentMonth = new Date().getMonth() + 1;
		const currentYear = new Date().getFullYear();
		document.getElementById('selectedYear').value = currentYear;
		selectMonth(currentMonth.toString().padStart(2, '0'));

	} else {
		updateChartTitle('So sánh vàng trong nước');
		loadData();
	}
}

// Set date limits (prevent future dates)
function setDateLimits() {
	const today = new Date().toISOString().split('T')[0];
	document.getElementById('selectedDate').max = today;
}

// Load data for specific date
function loadDataForDate() {
	const selectedDate = document.getElementById('selectedDate').value;
	if (selectedDate) {
		loadDataWithParams({ date: selectedDate });
	}
}

// Select month
function selectMonth(month) {
	selectedMonth = month;
	
	// Update button states
	document.querySelectorAll('.month-btn').forEach(btn => {
		btn.classList.remove('active');
		if (btn.dataset.month === month) {
			btn.classList.add('active');
		}
	});
	
	loadDataForMonth();
}

// Update month buttons when year changes
function updateMonthButtons() {
	// Reset selected month
	selectedMonth = null;
	document.querySelectorAll('.month-btn').forEach(btn => {
		btn.classList.remove('active');
	});
}

// Load data for specific month
function loadDataForMonth() {
	const selectedYear = document.getElementById('selectedYear').value;
	if (selectedMonth && selectedYear) {
		const monthParam = `${selectedYear}-${selectedMonth}`;
		loadDataWithParams({ month: monthParam });
	}
}

// Load data with parameters
async function loadDataWithParams(params) {
	try {
		const queryString = new URLSearchParams(params).toString();
		const response = await fetch(`/api/data?${queryString}`);

		if (!response.ok) {
			throw new Error('Failed to load data');
		}

		globalData = await response.json();

		// Update chart title based on view type
		if (globalData.view_type === 'daily') {
			updateChartTitle(`Dữ liệu ngày ${params.date}`);
		} else if (globalData.view_type === 'monthly') {
			const [year, month] = params.month.split('-');
			const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
			updateChartTitle(`${monthNames[parseInt(month)]} ${year}`);
		}

		// Reset selectedGoldType for monthly view to ensure chart updates
		if (globalData.view_type === 'monthly') {
			const goldTypes = Object.keys(globalData.chart_data || {}).filter(type => type !== 'Giá vàng thế giới');
			if (goldTypes.length > 0) {
				selectedGoldType = goldTypes[0];
			}
		}

		// Update UI
		updateLastUpdateTime();
		displayCurrentPrices();
		populateGoldTypeButtons();
		updateChart();
		displayWorldGoldPrice();
		if (typeof displayDomesticGoldCharts === 'function') displayDomesticGoldCharts();
		displayComparison();
		displayTrendAnalysis();
		displayMonthlySummary();

	} catch (error) {
		console.error('Error loading data:', error);
		showError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
	}
}

// Update chart title
function updateChartTitle(title) {
	document.getElementById('chartTitle').innerHTML = `📈 ${title}`;
}

// Display world gold price
function displayWorldGoldPrice() {
	const container = document.getElementById('worldGoldPrice');

	if (!globalData || !globalData.current_prices) {
		container.innerHTML = '<div class="loading">Không có dữ liệu</div>';
		return;
	}

	const worldGold = globalData.current_prices.find(item => item.type === 'Giá vàng thế giới');

	if (!worldGold || !worldGold.sell) {
		container.innerHTML = '<div class="loading">Không có dữ liệu giá vàng thế giới</div>';
		return;
	}

	// container.innerHTML = `
  //       <h3>Giá Vàng Thế Giới</h3>
  //       <div class="world-gold-value">$${parseFloat(worldGold.sell).toFixed(2)}</div>
  //       <div class="world-gold-change">${worldGold.change_sell || 'N/A'}</div>
  //   `;

	// Update world gold chart
	updateWorldGoldChart();
}

// Update world gold chart
function updateWorldGoldChart() {
	if (!globalData || !globalData.chart_data['Giá vàng thế giới']) {
		return;
	}

	const data = globalData.chart_data['Giá vàng thế giới'];

	const labels = data.map(item => {
		const date = new Date(item.date);
		return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
	});

	const sellprices = data.map(item => item.sell);
	const buyprices = data.map(item => item.buy);
	// Destroy existing chart if it exists
	if (worldGoldChart) {
		worldGoldChart.destroy();
		worldGoldChart = null;
	}

	// Create new chart
	const ctx = document.getElementById('worldGoldChart').getContext('2d');
	worldGoldChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [
				{
					label: 'Giá USD',
					data: sellprices,
					borderColor: '#f59e0b',
					backgroundColor: 'rgba(245, 158, 11, 0.1)',
					tension: 0.4,
					fill: true
				},
				{
					label: 'Giá Mua USD',
					data: buyprices,
					borderColor: '#3b82f6',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					tension: 0.4,
					fill: true
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: true,
					position: 'top'
				},
				tooltip: {
					mode: 'index',
					intersect: false,
					callbacks: {
						label: function (context) {
							return 'Giá: $' + context.parsed.y.toFixed(2);
						}
					}
				}
			},
			scales: {
				y: {
					ticks: {
						callback: function (value) {
							return '$' + value.toFixed(0);
						}
					}
				}
			}
		}
	});
}

// Display monthly summary chart
function displayMonthlySummary() {
	const monthlySummarySection = document.getElementById('monthlySummarySection');

	// Hide for daily view
	if (globalData && globalData.view_type === 'daily') {
		monthlySummarySection.style.display = 'none';
		return;
	}

	// Show for current view
	monthlySummarySection.style.display = 'block';

	if (!globalData || !globalData.chart_data) {
		return;
	}

	// Update title based on view type
	let titleText = 'Biến động giá';
	if (globalData.view_type === 'monthly' && selectedMonth) {
		const selectedYear = document.getElementById('selectedYear').value;
		const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
		titleText = `Biến động giá ${monthNames[parseInt(selectedMonth)]} ${selectedYear}`;
	} else {
		const currentMonth = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
		titleText = `Biến động giá ${currentMonth}`;
	}
	document.getElementById('monthlySummaryTitle').innerHTML = `📊 ${titleText}`;

	// Populate gold type buttons
	const container = document.getElementById('monthlyGoldTypeButtons');
	container.innerHTML = '';

	const goldTypes = Object.keys(globalData.chart_data).filter(type => type !== 'Giá vàng thế giới');

	goldTypes.forEach((type, index) => {
		const button = document.createElement('button');
		button.className = 'gold-type-btn';
		button.textContent = type;
		button.onclick = () => selectMonthlySummaryGoldType(type);

		if (index === 0) {
			button.classList.add('active');
			updateMonthlySummaryChart(type);
		}

		container.appendChild(button);
	});
}

// Select gold type for monthly summary
function selectMonthlySummaryGoldType(type) {
	// Update button states
	document.querySelectorAll('#monthlyGoldTypeButtons .gold-type-btn').forEach(btn => {
		btn.classList.remove('active');
		if (btn.textContent === type) {
			btn.classList.add('active');
		}
	});

	updateMonthlySummaryChart(type);
}

// Update monthly summary chart
function updateMonthlySummaryChart(goldType) {
	if (monthlySummaryChart) {
		monthlySummaryChart.destroy();
		monthlySummaryChart = null;
	}

	if (!globalData || !globalData.chart_data[goldType]) {
		return;
	}

	const data = globalData.chart_data[goldType];
	const ctx = document.getElementById('monthlySummaryChart').getContext('2d');

	const labels = data.map(item => {
		const date = new Date(item.date);
		return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
	});

	const buyPrices = data.map(item => item.buy);
	const sellPrices = data.map(item => item.sell);

	monthlySummaryChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [
				{
					label: 'Giá mua',
					data: buyPrices,
					borderColor: '#22c55e',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					tension: 0.4,
					fill: true
				},
				{
					label: 'Giá bán',
					data: sellPrices,
					borderColor: '#ef4444',
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					tension: 0.4,
					fill: true
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: true,
					position: 'top'
				},
				tooltip: {
					mode: 'index',
					intersect: false,
					callbacks: {
						label: function (context) {
							return context.dataset.label + ': ' + formatVND(context.parsed.y * 1000000);
						}
					}
				}
			},
			scales: {
				y: {
					ticks: {
						callback: function (value) {
							return formatNumber(value);
						}
					}
				}
			}
		}
	});
}