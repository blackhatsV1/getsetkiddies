-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 02, 2025 at 09:10 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `getsetkiddies`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `id` int(11) NOT NULL,
  `child_id` int(11) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `readable_address` varchar(255) DEFAULT NULL,
  `date_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parents`
--

CREATE TABLE `parents` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `home_address` text DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parents`
--

INSERT INTO `parents` (`id`, `firstname`, `lastname`, `email`, `phone_number`, `home_address`, `password`, `date_created`) VALUES
(1, 'ellen', 'cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '123', '2025-11-01 13:36:34'),
(2, 'Jerson', 'Galabo', 'jerson@gmail.com', '0987654321', 'Leon Iloilo', '123', '2025-11-02 04:25:39');

-- --------------------------------------------------------

--
-- Table structure for table `registered_children`
--

CREATE TABLE `registered_children` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `child_age` int(11) DEFAULT NULL,
  `child_gender` varchar(20) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `parent_name` varchar(150) DEFAULT NULL,
  `parent_email` varchar(100) DEFAULT NULL,
  `parent_number` varchar(20) DEFAULT NULL,
  `parent_home_address` text DEFAULT NULL,
  `geofence_lat` double DEFAULT NULL,
  `geofence_lng` double DEFAULT NULL,
  `geofence_radius` int(11) DEFAULT NULL,
  `date_registered` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registered_children`
--

INSERT INTO `registered_children` (`id`, `firstname`, `lastname`, `child_age`, `child_gender`, `parent_id`, `parent_name`, `parent_email`, `parent_number`, `parent_home_address`, `date_registered`) VALUES
(5, 'jayrold', 'tabalina', 12, 'Male', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-02 03:20:37'),
(6, 'yasmine', 'talaman', 12, 'Female', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-02 03:21:15'),
(7, 'jayrold', 'tabalina', 12, 'Male', 2, 'Jerson Galabo', 'jerson@gmail.com', '0987654321', 'Leon Iloilo', '2025-11-02 04:25:59'),
(8, 'jerson', 'galabo', 12, 'Male', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-02 04:47:42');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `child_id` (`child_id`);

--
-- Indexes for table `parents`
--
ALTER TABLE `parents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `registered_children`
--
ALTER TABLE `registered_children`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `parents`
--
ALTER TABLE `parents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `registered_children`
--
ALTER TABLE `registered_children`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `registered_children` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `registered_children`
--
ALTER TABLE `registered_children`
  ADD CONSTRAINT `registered_children_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `registered_children_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
