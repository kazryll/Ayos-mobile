// app/index.tsx - CLEAN VERSION
import { StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { auth, db } from '../config/firebase';

console.log('Firebase initialized successfully!');
console.log('Auth:', auth);
console.log('DB:', db);

export default function Index() {  
  return <Redirect href="/splash" />;
}